"""Streamlit control panel for realtime evaluation runs.

Run from backend/:
    streamlit run observability/dashboard_streamlit.py
"""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import streamlit as st


BACKEND_DIR = Path(__file__).resolve().parents[1]
OBSERVABILITY_DIR = BACKEND_DIR / "observability"
ENV_PATH = OBSERVABILITY_DIR / ".env"
REPORT_DIR = OBSERVABILITY_DIR / "reports"


def load_env(path: Path = ENV_PATH) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def mask(value: str | None) -> str:
    if not value:
        return "missing"
    if len(value) <= 10:
        return "set"
    return f"{value[:6]}...{value[-4:]}"


def env_table(env: dict[str, str], keys: list[str]) -> list[dict[str, Any]]:
    return [{"key": key, "status": "set" if env.get(key) else "missing", "value": mask(env.get(key))} for key in keys]


def new_run_id() -> str:
    return "run_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def main() -> None:
    env = load_env()
    st.set_page_config(page_title="Realtime Evaluation Lab", layout="wide")
    st.title("Realtime Evaluation Lab")
    st.caption("Team 1 -> Team 2+3 -> Team 4 observability, evaluation, and scale readiness.")

    local_grafana = env.get("GRAFANA_URL", "http://localhost:3001")
    local_prometheus = env.get("PROMETHEUS_URL", "http://localhost:9090")
    cloud_grafana = env.get("GRAFANA_CLOUD_URL", "")
    app_metrics = env.get("APP_METRICS_URL", "http://localhost:9108/metrics")

    st.subheader("Monitoring")
    col_local, col_cloud, col_env = st.columns([1, 1, 1.2])
    with col_local:
        st.markdown(f"[Local Grafana]({local_grafana})")
        st.markdown(f"[Local Prometheus]({local_prometheus})")
        st.markdown(f"[App metrics]({app_metrics})")
    with col_cloud:
        if cloud_grafana:
            st.markdown(f"[Grafana Cloud]({cloud_grafana})")
        else:
            st.caption("Grafana Cloud URL is not set yet.")
        remote_ready = all(
            env.get(key)
            for key in (
                "GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL",
                "GRAFANA_CLOUD_PROMETHEUS_USERNAME",
                "GRAFANA_CLOUD_PROMETHEUS_PASSWORD",
            )
        )
        st.metric("remote_write", "ready" if remote_ready else "missing")
    with col_env:
        required = ["TIMESCALE_DB_URL", "SUPABASE_DB_URL", "RABBITMQ_URL"]
        st.dataframe(env_table(env, required), hide_index=True, use_container_width=True)

    with st.sidebar:
        st.header("Run config")
        run_id = st.text_input("run_id", value=new_run_id())
        profile = st.selectbox("Profile", ["smoke", "demo", "load_baseline", "stress", "soak", "manual"], index=0)
        patient_id = st.text_input("Patient ID", value="P005")
        patient_ids_text = st.text_area("Patient IDs for load test", value="", help="Optional whitespace/comma separated IDs. Overrides Patient ID when set.")
        concurrency = st.number_input("Publisher concurrency", min_value=1, max_value=100, value=1, step=1)
        output_dir = st.text_input("Simulator output dir", value=str(BACKEND_DIR / "simulator" / "output"))
        streams = st.multiselect(
            "Streams",
            [
                "wearable_continuous",
                "wearable_spo2_triggered",
                "wearable_bp_triggered",
                "wearable_ppi_batch",
                "wearable_motion_batch",
                "wearable_battery",
                "daily_metrics",
            ],
            default=["wearable_continuous", "wearable_spo2_triggered", "wearable_ppi_batch", "wearable_motion_batch"],
        )
        limit = st.number_input("Message limit per JSONL stream", min_value=1, max_value=100000, value=120, step=10)
        target_msg_sec = st.number_input("Target messages/sec", min_value=0.1, max_value=1000.0, value=5.0, step=1.0)
        duration_seconds = st.number_input("Duration seconds (0 = no wall-clock cap)", min_value=0, max_value=86400, value=0, step=30)
        team4_path = st.selectbox("Team4 path", ["rabbitmq", "supabase-poll", "none"], index=0)
        prometheus_port = st.number_input("Prometheus port", min_value=0, max_value=65535, value=9108, step=1)
        dry_run = st.checkbox("Dry run publisher", value=False)
        no_declare = st.checkbox("No declare topology", value=True)

    cmd = [
        sys.executable,
        "-m",
        "observability.run_realtime_evaluation",
        "--run-id",
        run_id,
        "--profile",
        profile,
        "--patient-id",
        patient_id,
        "--output-dir",
        output_dir,
        "--streams",
        *streams,
        "--limit",
        str(limit),
        "--target-msg-sec",
        str(target_msg_sec),
        "--team4-path",
        team4_path,
        "--prometheus-port",
        str(prometheus_port),
    ]
    if duration_seconds:
        cmd.extend(["--duration-seconds", str(duration_seconds)])
    patient_ids = [item.strip() for item in patient_ids_text.replace(",", " ").split() if item.strip()]
    if patient_ids:
        cmd.extend(["--patient-ids", *patient_ids, "--concurrency", str(concurrency)])
    if dry_run:
        cmd.append("--dry-run")
    if no_declare:
        cmd.append("--no-declare")

    st.subheader("Command")
    st.code(" ".join(cmd), language="bash")
    if not streams:
        st.warning("Pick at least one simulator stream before starting a run.")

    col_run, col_setup, col_reports = st.columns([1, 1, 2])
    with col_run:
        if st.button("Start evaluation run", type="primary", use_container_width=True, disabled=not streams):
            with st.spinner("Running evaluation..."):
                proc = subprocess.run(cmd, cwd=BACKEND_DIR, text=True, capture_output=True)
            st.session_state["last_stdout"] = proc.stdout
            st.session_state["last_stderr"] = proc.stderr
            st.session_state["last_returncode"] = proc.returncode
            if proc.returncode == 0:
                st.success("Evaluation finished")
            else:
                st.error(f"Evaluation failed with exit code {proc.returncode}")

    with col_setup:
        st.caption("Grafana Cloud config")
        st.code(
            "powershell -NoProfile -ExecutionPolicy Bypass -File "
            "observability/scripts/generate_prometheus_cloud_config.ps1",
            language="powershell",
        )
        st.caption("Then set PROMETHEUS_CONFIG_FILE=./prometheus/prometheus.cloud.yml and restart Prometheus.")

    with col_reports:
        st.metric("Prometheus", f"http://localhost:{prometheus_port}/metrics" if prometheus_port else "disabled")
        st.caption("Streamlit triggers runs; Grafana is the real dashboard for mentor/reporting.")

    st.subheader("Runbook")
    st.markdown(
        "- Local dashboards: start `docker compose --env-file .env up -d` in `backend/observability`.\n"
        "- Grafana Cloud metrics: fill `GRAFANA_CLOUD_*`, generate `prometheus.cloud.yml`, set `PROMETHEUS_CONFIG_FILE`, restart compose.\n"
        "- Grafana Cloud DB dashboards: add PostgreSQL datasources for TigerData and Supabase, then import dashboard JSON files."
    )

    if "last_returncode" in st.session_state:
        st.subheader("Last run output")
        st.code(st.session_state.get("last_stdout", ""), language="text")
        if st.session_state.get("last_stderr"):
            st.code(st.session_state["last_stderr"], language="text")

    st.subheader("Reports")
    if REPORT_DIR.exists():
        reports = sorted(REPORT_DIR.glob("*_summary.md"), reverse=True)[:10]
        for report in reports:
            st.markdown(f"- `{report.name}`")
    else:
        st.caption("No reports yet.")


if __name__ == "__main__":
    main()
