from __future__ import annotations

from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.repositories.supabase.client import SupabaseRestClient


class SupabaseAlertRepository:
    def __init__(self, supabase_url: str, service_key: str) -> None:
        self.client = SupabaseRestClient(supabase_url, service_key)

    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        for table, id_column in (("health_alerts", "alert_id"), ("alerts", "alert_id"), ("portal_alerts", "id")):
            rows = self.client.select(
                table,
                {"select": "*", id_column: f"eq.{alert_id}", "limit": "1"},
            )
            if rows:
                return _normalize_alert_row(rows[0], table)
        raise RepositoryItemNotFoundError(f"Alert with ID {alert_id} not found in Supabase")

    def get_latest_alert_id_by_patient(self, patient_id: str) -> str | None:
        for table, timestamp_column, id_column in (
            ("health_alerts", "timestamp", "alert_id"),
            ("alerts", "alert_time", "alert_id"),
            ("portal_alerts", "timestamp", "id"),
        ):
            rows = self.client.select(
                table,
                {
                    "select": "*",
                    "patient_id": f"eq.{patient_id}",
                    "order": f"{timestamp_column}.desc",
                    "limit": "1",
                },
            )
            if rows:
                return str(rows[0].get(id_column))
        return None

    def get_alerts_by_patient(self, patient_id: str, limit: int = 10) -> list[dict[str, Any]]:
        for table, timestamp_column in (
            ("health_alerts", "timestamp"),
            ("alerts", "alert_time"),
            ("portal_alerts", "timestamp"),
        ):
            rows = self.client.select(
                table,
                {
                    "select": "*",
                    "patient_id": f"eq.{patient_id}",
                    "order": f"{timestamp_column}.desc",
                    "limit": str(limit),
                },
            )
            if rows:
                return [_normalize_alert_row(row, table) for row in rows]
        return []


def _normalize_alert_row(row: dict[str, Any], table: str) -> dict[str, Any]:
    if table == "portal_alerts":
        return {
            "alert_id": row.get("id"),
            "patient_id": row.get("patient_id"),
            "timestamp": row.get("timestamp"),
            "alert_type": row.get("type"),
            "health_status": row.get("workflow_status"),
            "severity": row.get("severity"),
            "confidence": row.get("score"),
            "evidence": row.get("evidence") or [],
            "message": row.get("noise_note"),
            "sensor_context": [],
        }
    if table == "alerts":
        return {
            "alert_id": row.get("alert_id"),
            "patient_id": row.get("patient_id"),
            "timestamp": row.get("alert_time"),
            "alert_type": row.get("alert_type"),
            "health_status": row.get("status"),
            "severity": row.get("severity"),
            "confidence": row.get("confidence"),
            "evidence": row.get("features") or [],
            "message": row.get("reason"),
            "sensor_context": [],
        }
    return {
        "alert_id": row.get("alert_id"),
        "patient_id": row.get("patient_id"),
        "timestamp": row.get("timestamp"),
        "alert_type": row.get("alert_type"),
        "health_status": row.get("health_status"),
        "severity": row.get("severity"),
        "confidence": row.get("confidence"),
        "evidence": row.get("evidence") or [],
        "message": row.get("message"),
        "sensor_context": [],
    }
