from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import psycopg2

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_DATABASE_DIR = _BACKEND_DIR / "database"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from database.config import load_database_config


def _connect(database: str) -> Any:
    config = load_database_config()
    url = config.require_supabase_db_url() if database == "supabase" else config.require_timescale_db_url()
    return psycopg2.connect(url)


def migration_files(database: str) -> list[Path]:
    directory = _DATABASE_DIR / "migrations" / database
    return sorted(directory.glob("*.sql"))


def apply_migrations(database: str) -> list[str]:
    applied: list[str] = []
    with _connect(database) as conn:
        with conn.cursor() as cur:
            for path in migration_files(database):
                sql = path.read_text(encoding="utf-8")
                cur.execute(sql)
                applied.append(str(path))
    return applied


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Health-App SQL migrations in filename order.")
    parser.add_argument("--database", choices=["supabase", "tigerdata"], required=True)
    parser.add_argument("--yes", action="store_true", help="Required because this mutates the database.")
    args = parser.parse_args()
    if not args.yes:
        raise SystemExit("Refusing to apply migrations without --yes")
    applied = apply_migrations(args.database)
    print("Applied migrations:")
    for path in applied:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
