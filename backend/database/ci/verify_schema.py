from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

_BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from database.config import load_database_config


SUPABASE_TABLES = {
    "patients": {"patient_id", "mimic_subject_id", "name", "height_cm", "baseline_signals"},
    "patient_lab_results": {"lab_result_id", "patient_id", "sampled_at", "panel_type", "test_name", "value_numeric"},
    "clinical_staff": {"staff_id", "user_id", "full_name", "role"},
    "staff_shifts": {"shift_id", "staff_id", "shift_start", "shift_end"},
    "devices": {"device_id", "patient_id", "external_device_key"},
    "device_sensors": {"sensor_id", "device_id", "stream_name", "sampling_mode"},
    "alerts": {"alert_id", "patient_id", "severity", "alert_time", "status"},
    "alert_context": {"alert_id", "patient_id", "summary"},
    "alert_reviews": {"review_id", "alert_id", "staff_id"},
    "scenario_definitions": {"scenario_id", "scenario_type", "expected_signals"},
    "scenario_ground_truth": {"episode_id", "patient_id", "episode_type", "start_time", "end_time"},
    "wearable_fault_log": {"fault_id", "patient_id", "stream_name", "fault_type", "occurred_at"},
    "notifications": {"notification_id", "alert_id", "channel", "status"},
    "event_audit_logs": {"id", "event_id", "status"},
}

TIMESCALE_TABLES = {
    "raw_sensor_events": {"received_at", "stream_name", "raw_payload"},
    "wearable_continuous": {"time", "message_id", "patient_id", "heart_rate"},
    "wearable_intervals": {"time", "interval_type", "window_start", "window_end"},
    "ppi_patches": {"time", "window_start", "window_end", "ppi_intervals_ms", "beat_count"},
    "wearable_measurements": {"time", "measurement_type", "spo2", "battery_level"},
    "motion_batches": {"window_start", "message_id", "motion_points"},
    "ecg_measurements": {"measurement_id", "time", "message_id", "ecg_points"},
    "sleep_sessions": {"sleep_session_id", "sleep_date", "detail"},
    "sleep_stage_intervals": {"stage_id", "sleep_session_id", "state"},
    "daily_hrv_metrics": {"patient_id", "date", "hrv_rmssd_morning"},
    "health_features": {"time", "patient_id", "feature_window", "features"},
    "latest_sensor_values": {"patient_id", "device_id", "metric", "last_measured_at"},
    "test_runs": {"run_id", "status", "config", "summary"},
    "test_run_steps": {"run_id", "step", "status"},
    "perf_trace_events": {"run_id", "component", "stage", "event_time", "metadata"},
    "perf_queue_samples": {"run_id", "queue_name", "message_count"},
    "evaluation_results": {"run_id", "metric", "status"},
}

EXPECTED_HYPERTABLES = {
    "raw_sensor_events",
    "wearable_continuous",
    "wearable_intervals",
    "ppi_patches",
    "wearable_measurements",
    "motion_batches",
    "health_features",
    "perf_trace_events",
    "perf_queue_samples",
}


def _connect(database: str) -> Any:
    config = load_database_config()
    url = config.require_supabase_db_url() if database == "supabase" else config.require_timescale_db_url()
    return psycopg2.connect(url)


def _columns(conn: Any, schema: str) -> dict[str, set[str]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = %s
            """,
            (schema,),
        )
        result: dict[str, set[str]] = {}
        for row in cur.fetchall():
            result.setdefault(row["table_name"], set()).add(row["column_name"])
        return result


def _indexes(conn: Any, schema: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = %s
            """,
            (schema,),
        )
        return {row[0] for row in cur.fetchall()}


def _hypertables(conn: Any) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT hypertable_name
            FROM timescaledb_information.hypertables
            WHERE hypertable_schema = current_schema()
            """
        )
        return {row[0] for row in cur.fetchall()}


def verify(database: str) -> dict[str, Any]:
    expected = SUPABASE_TABLES if database == "supabase" else TIMESCALE_TABLES
    schema = "public" if database == "supabase" else "public"
    with _connect(database) as conn:
        found_columns = _columns(conn, schema)
        found_indexes = _indexes(conn, schema)
        missing_tables = sorted(set(expected) - set(found_columns))
        missing_columns = {
            table: sorted(columns - found_columns.get(table, set()))
            for table, columns in expected.items()
            if columns - found_columns.get(table, set())
        }
        result: dict[str, Any] = {
            "database": database,
            "ok": not missing_tables and not missing_columns,
            "missing_tables": missing_tables,
            "missing_columns": missing_columns,
            "index_count": len(found_indexes),
        }
        if database == "tigerdata":
            found_hypertables = _hypertables(conn)
            missing_hypertables = sorted(EXPECTED_HYPERTABLES - found_hypertables)
            result["missing_hypertables"] = missing_hypertables
            result["normal_tables_expected"] = [
                "ecg_measurements",
                "sleep_stage_intervals",
                "sleep_sessions",
                "daily_hrv_metrics",
                "latest_sensor_values",
                "test_runs",
                "test_run_steps",
                "evaluation_results",
            ]
            result["ok"] = result["ok"] and not missing_hypertables
        return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify Health-App database schema after migrations are applied.")
    parser.add_argument("--database", choices=["supabase", "tigerdata"], required=True)
    args = parser.parse_args()
    result = verify(args.database)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
