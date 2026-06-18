from __future__ import annotations

import argparse
import os
import random
import unicodedata
from dataclasses import dataclass
from typing import Iterable

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row


SEED = 20260615
DEFAULT_LIMIT = 100

DUPLICATE_NAME_PLAN = [
    ("Nguyen Van A", 4),
    ("Tran Thi B", 4),
    ("Le Van C", 3),
    ("Pham Minh D", 3),
    ("Hoang Thi H", 3),
    ("Vu Minh K", 2),
    ("Dang Ngoc L", 2),
    ("Bui Thanh M", 2),
]

LAST_NAMES = [
    "Nguyen",
    "Tran",
    "Le",
    "Pham",
    "Hoang",
    "Vu",
    "Dang",
    "Bui",
    "Do",
    "Phan",
]

MIDDLE_NAMES = [
    "Van",
    "Thi",
    "Minh",
    "Ngoc",
    "Thanh",
    "Quang",
    "Hoai",
    "Gia",
    "Duc",
    "Anh",
]

GIVEN_NAMES = [
    "An",
    "Binh",
    "Chau",
    "Dung",
    "Giang",
    "Ha",
    "Khanh",
    "Linh",
    "Nam",
    "Phuc",
    "Quan",
    "Son",
    "Tam",
    "Trang",
    "Vy",
]


@dataclass(frozen=True)
class DirectoryRow:
    hospital_patient_code: str
    subject_id: str
    display_name: str
    display_name_normalized: str


def normalize_name(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def build_name_pool(total: int) -> list[str]:
    names: list[str] = []
    for name, count in DUPLICATE_NAME_PLAN:
        names.extend([name] * count)

    rng = random.Random(SEED)
    used = set(names)
    while len(names) < total:
        candidate = f"{rng.choice(LAST_NAMES)} {rng.choice(MIDDLE_NAMES)} {rng.choice(GIVEN_NAMES)}"
        if candidate in used:
            continue
        used.add(candidate)
        names.append(candidate)
    return names[:total]


def build_directory_rows(subject_ids: Iterable[str], *, limit: int = DEFAULT_LIMIT) -> list[DirectoryRow]:
    selected_subjects = [str(subject_id) for subject_id in subject_ids][:limit]
    names = build_name_pool(len(selected_subjects))
    return [
        DirectoryRow(
            hospital_patient_code=f"P{index:03d}",
            subject_id=subject_id,
            display_name=names[index - 1],
            display_name_normalized=normalize_name(names[index - 1]),
        )
        for index, subject_id in enumerate(selected_subjects, start=1)
    ]


def resolve_dsn() -> str:
    load_dotenv()
    dsn = os.getenv("MEMORY_POSTGRES_DSN") or os.getenv("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is required")
    return dsn


def fetch_subject_ids(dsn: str, *, limit: int) -> list[str]:
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT subject_id
                FROM hosp_patients
                ORDER BY subject_id
                LIMIT %s
                """,
                (limit,),
            )
            return [str(row["subject_id"]) for row in cur.fetchall()]


def ensure_table(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_directory (
                hospital_patient_code TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                display_name TEXT NOT NULL,
                display_name_normalized TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_directory_subject_id
            ON patient_directory(subject_id)
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_patient_directory_display_name_norm
            ON patient_directory(display_name_normalized)
            """
        )


def upsert_rows(dsn: str, rows: list[DirectoryRow]) -> None:
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        ensure_table(conn)
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO patient_directory (
                    hospital_patient_code,
                    subject_id,
                    display_name,
                    display_name_normalized,
                    is_active
                )
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (hospital_patient_code) DO UPDATE SET
                    subject_id = EXCLUDED.subject_id,
                    display_name = EXCLUDED.display_name,
                    display_name_normalized = EXCLUDED.display_name_normalized,
                    is_active = TRUE
                """,
                [
                    (
                        row.hospital_patient_code,
                        row.subject_id,
                        row.display_name,
                        row.display_name_normalized,
                    )
                    for row in rows
                ],
            )


def print_preview(rows: list[DirectoryRow]) -> None:
    for row in rows:
        print(
            f"{row.hospital_patient_code}\t{row.subject_id}\t"
            f"{row.display_name}\t{row.display_name_normalized}"
        )


def print_duplicate_summary(rows: list[DirectoryRow]) -> None:
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.display_name] = counts.get(row.display_name, 0) + 1
    duplicates = {name: count for name, count in counts.items() if count > 1}
    print("\nDuplicate display-name groups:")
    for name, count in sorted(duplicates.items()):
        print(f"- {name}: {count}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed synthetic patient directory rows.")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--dry-run", action="store_true", help="Print generated rows without uploading.")
    parser.add_argument("--duplicates", action="store_true", help="Print duplicate-name summary.")
    args = parser.parse_args()

    dsn = resolve_dsn()
    subject_ids = fetch_subject_ids(dsn, limit=args.limit)
    if len(subject_ids) < args.limit:
        raise SystemExit(f"Need {args.limit} patients, found {len(subject_ids)} in hosp_patients")

    rows = build_directory_rows(subject_ids, limit=args.limit)
    if args.dry_run:
        print_preview(rows)
        if args.duplicates:
            print_duplicate_summary(rows)
        return

    upsert_rows(dsn, rows)
    print(f"Seeded {len(rows)} patient_directory rows")
    if args.duplicates:
        print_duplicate_summary(rows)


if __name__ == "__main__":
    main()
