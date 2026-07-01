#!/usr/bin/env python3
"""Copy split Postgres fields from backend/.env into observability/.env for Grafana."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


def read_env(path: Path) -> tuple[list[str], dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(path)
    lines = path.read_text(encoding="utf-8").splitlines()
    values: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip()
    return lines, values


def write_env_value(lines: list[str], key: str, value: str) -> None:
    pattern = re.compile(rf"^\s*{re.escape(key)}=")
    for index, line in enumerate(lines):
        if pattern.match(line):
            lines[index] = f"{key}={value}"
            return
    lines.append(f"{key}={value}")


def split_db_url(url: str, *, password_fallback: str = "") -> dict[str, str]:
    parsed = urlparse(url)
    user = ""
    password = password_fallback
    if parsed.username:
        user = unquote(parsed.username)
    if parsed.password:
        password = unquote(parsed.password)
    db = parsed.path.lstrip("/") or "postgres"
    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", ["require"])[0]
    port = str(parsed.port or 5432)
    return {
        "HOST": parsed.hostname or "",
        "PORT": port,
        "DB": db,
        "USER": user,
        "PASSWORD": password,
        "SSLMODE": sslmode,
    }


def main() -> int:
    backend_env = Path(sys.argv[1] if len(sys.argv) > 1 else "../../.env").resolve()
    obs_env = Path(sys.argv[2] if len(sys.argv) > 2 else "../.env").resolve()

    _, backend = read_env(backend_env)
    lines, obs = read_env(obs_env)

    timescale_url = backend.get("TIMESCALE_DB_URL", obs.get("TIMESCALE_DB_URL", ""))
    timescale_password = backend.get("TIMESCALE_DB_PASSWORD", obs.get("TIMESCALE_DB_PASSWORD", ""))
    supabase_url = (
        backend.get("SUPABASE_DB_URL")
        or backend.get("DATABASE_URL")
        or obs.get("SUPABASE_DB_URL")
        or ""
    )

    if not timescale_url:
        print("Missing TIMESCALE_DB_URL in backend .env", file=sys.stderr)
        return 1

    # Prefer direct Supabase host for Grafana (pooler can break prepared statements).
    if supabase_url and "pooler.supabase.com" in supabase_url:
        project_ref = ""
        supabase_url_parsed = urlparse(supabase_url)
        pooler_user = unquote(supabase_url_parsed.username or "")
        pooler_password = unquote(supabase_url_parsed.password or "")
        if "." in pooler_user:
            project_ref = pooler_user.split(".", 1)[1]
        if not project_ref and backend.get("SUPABASE_URL"):
            host = urlparse(backend["SUPABASE_URL"]).hostname or ""
            project_ref = host.split(".")[0]

        write_env_value(lines, "SUPABASE_POOLER_HOST", supabase_url_parsed.hostname or "")
        write_env_value(lines, "SUPABASE_POOLER_PORT", str(supabase_url_parsed.port or 5432))
        write_env_value(lines, "SUPABASE_POOLER_USER", pooler_user)
        write_env_value(lines, "SUPABASE_POOLER_PASSWORD", pooler_password)

        if project_ref:
            direct = {
                "HOST": f"db.{project_ref}.supabase.co",
                "PORT": "5432",
                "DB": "postgres",
                "USER": "postgres",
                "PASSWORD": pooler_password,
                "SSLMODE": "require",
            }
            for key, value in direct.items():
                write_env_value(lines, f"SUPABASE_{key}", value)
            print(f"Supabase: Grafana fields -> db.{project_ref}.supabase.co (direct)")
            print(f"Supabase: pooler fallback -> {supabase_url_parsed.hostname}")
        else:
            parts = split_db_url(supabase_url)
            for key, value in parts.items():
                write_env_value(lines, f"SUPABASE_{key}", value)
    elif supabase_url:
        parts = split_db_url(supabase_url)
        for key, value in parts.items():
            write_env_value(lines, f"SUPABASE_{key}", value)

    ts_parts = split_db_url(timescale_url, password_fallback=timescale_password)
    for key, value in ts_parts.items():
        write_env_value(lines, f"TIMESCALE_{key}", value)

    for key in ("TIMESCALE_DB_URL", "TIMESCALE_DB_PASSWORD", "SUPABASE_URL", "RABBITMQ_URL"):
        if backend.get(key):
            write_env_value(lines, key, backend[key])
    if backend.get("DATABASE_URL"):
        write_env_value(lines, "SUPABASE_DB_URL", backend["DATABASE_URL"])

    obs_env.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Updated Grafana DB variables in {obs_env}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
