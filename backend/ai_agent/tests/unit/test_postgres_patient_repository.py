from __future__ import annotations

from typing import Any

from app.repositories.postgres.patient_repository import _search_patients_table_by_normalized_name


class FakeCursor:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, *args: object, **kwargs: object) -> None:
        return None

    def fetchall(self) -> list[dict[str, Any]]:
        return self.rows


class FakeConnection:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def cursor(self) -> FakeCursor:
        return FakeCursor(self.rows)


def test_patients_table_normalized_name_fallback_matches_accented_query() -> None:
    rows = [
        {"patient_id": "P001", "display_name": "nguyen van hung", "gender": "M", "age": 67},
        {"patient_id": "P002", "display_name": "Tran Thi B", "gender": "F", "age": 50},
    ]

    matches = _search_patients_table_by_normalized_name(
        FakeConnection(rows),
        normalized_query="nguyen van hung",
        limit=10,
    )

    assert [match["patient_id"] for match in matches] == ["P001"]

