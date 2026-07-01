from __future__ import annotations

from typing import Any, Iterable, Sequence

from psycopg2.extras import Json, execute_values


def json_value(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return Json(value)
    return value


def rows_from_models(models: Iterable[Any], columns: Sequence[str]) -> list[tuple[Any, ...]]:
    rows: list[tuple[Any, ...]] = []
    for model in models:
        data = model.db_dict() if hasattr(model, "db_dict") else dict(model)
        rows.append(tuple(json_value(data.get(column)) for column in columns))
    return rows


def execute_batch_insert(
    cursor: Any,
    *,
    table: str,
    columns: Sequence[str],
    rows: Sequence[tuple[Any, ...]],
    conflict_sql: str,
    page_size: int = 500,
) -> None:
    if not rows:
        return
    column_sql = ", ".join(columns)
    sql = f"INSERT INTO {table} ({column_sql}) VALUES %s {conflict_sql}"
    execute_values(cursor, sql, rows, page_size=page_size)
