#!/usr/bin/env python3
"""
Inspect Supabase/PostgreSQL schema BEFORE writing ingestion code.

Usage (from backend/):
  python scripts/inspect_database.py
  python scripts/inspect_database.py --json ../docs/team2_db_inspection_report.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv

from settings import load_database_settings, load_database_url, load_inspector_settings


def inspect(conn, inspector: InspectorSettings) -> dict:
    from psycopg2.extras import RealDictCursor

    schema = inspector.schema_name
    report: dict = {"tables": {}, "indexes": [], "foreign_keys": [], "gaps": [], "notes": []}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """,
            (schema,),
        )
        table_names = [r["table_name"] for r in cur.fetchall()]

        for table in table_names:
            cur.execute(
                """
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
                """,
                (schema, table),
            )
            columns = [dict(r) for r in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) AS n FROM {table}")
            row_count = int(cur.fetchone()["n"])
            report["tables"][table] = {"columns": columns, "row_count": row_count}

        cur.execute(
            """
            SELECT tablename, indexname
            FROM pg_indexes
            WHERE schemaname = %s
            ORDER BY tablename, indexname
            """,
            (schema,),
        )
        report["indexes"] = [dict(r) for r in cur.fetchall()]

        cur.execute(
            """
            SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = %s
            """,
            (schema,),
        )
        report["foreign_keys"] = [dict(r) for r in cur.fetchall()]

    missing_tables = [t for t in inspector.expected_tables if t not in table_names]
    if missing_tables:
        report["gaps"].append(f"Missing tables: {', '.join(missing_tables)}")

    clean_table = inspector.clean_vitals_table
    if clean_table in report["tables"]:
        actual_cols = {c["column_name"] for c in report["tables"][clean_table]["columns"]}
        required = set(inspector.required_clean_columns)
        missing_cols = sorted(required - actual_cols)
        if missing_cols:
            report["gaps"].append(
                f"{clean_table} missing required columns: {', '.join(missing_cols)}"
            )
        if inspector.data_state_column not in actual_cols:
            report["notes"].append(inspector.data_state_storage_note)

    if inspector.raw_vitals_table not in table_names:
        report["gaps"].append(
            f"{inspector.raw_vitals_table} table missing — cannot store broker payloads"
        )

    return report


def print_report(report: dict, schema_name: str) -> None:
    print("=" * 60)
    print(f"DATABASE INSPECTION ({schema_name} schema)")
    print("=" * 60)
    for table, info in report["tables"].items():
        print(f"\n[{table}] rows={info['row_count']}")
        for col in info["columns"]:
            print(
                f"  - {col['column_name']:<24} {col['data_type']:<18} "
                f"nullable={col['is_nullable']}"
            )

    if report["foreign_keys"]:
        print("\n[Foreign keys]")
        for fk in report["foreign_keys"]:
            print(f"  {fk['table_name']}.{fk['column_name']} -> {fk['foreign_table']}")

    if report.get("notes"):
        print("\n[Notes]")
        for note in report["notes"]:
            print(f"  - {note}")

    print("\n[Gap analysis vs Sprint 1 contract]")
    if report["gaps"]:
        for gap in report["gaps"]:
            print(f"  ! {gap}")
    else:
        print("  OK — core tables/columns aligned for ingestion")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect live Supabase schema")
    parser.add_argument("--json", type=Path, help="Write full report to JSON file")
    args = parser.parse_args()

    load_dotenv(_BACKEND / ".env", override=False)
    try:
        url = load_database_url()
    except ValueError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 1

    db = load_database_settings()
    inspector = load_inspector_settings()

    if "@" in url.split("://", 1)[-1].split("@", 1)[0]:
        print(
            "Warning: DATABASE_URL password may contain unencoded '@'. "
            "Use %40 in the password segment.",
            file=sys.stderr,
        )

    import psycopg2

    try:
        conn = psycopg2.connect(url, connect_timeout=db.connect_timeout_seconds)
    except Exception as exc:
        print(f"Connection failed: {exc}", file=sys.stderr)
        print(
            "\nCheck: Session pooler host, user postgres.PROJECT_REF, "
            "DB password (not API keys), password URL-encoding.",
            file=sys.stderr,
        )
        return 2

    try:
        report = inspect(conn, inspector)
    finally:
        conn.close()

    print_report(report, inspector.schema_name)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
        print(f"\nSaved JSON report: {args.json}")

    return 1 if report["gaps"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
