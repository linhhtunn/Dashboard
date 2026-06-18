from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.contracts import tool_not_found, tool_success
from app.repositories.ports import PatientRepository
from app.tools.base import ToolContext, ToolRequest


SEVERITY_RANK = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "WARNING": 2,
    "LOW": 1,
    "INFO": 0,
}


@dataclass(frozen=True)
class PatientSearchContextTool:
    patient_repository: PatientRepository

    name: str = "clinical.patient_search_context"
    description: str = "Search patients by hospital code, subject ID, or synthetic display name."

    async def run(self, request: ToolRequest, context: ToolContext | None = None):
        query = _lookup_query(request.arguments)
        if not query:
            return tool_not_found(tool_name=self.name, message="search query is required")

        payload = self.patient_repository.search_patients(query, limit=int(request.arguments.get("limit", 10)))
        patients = payload.get("patients", [])
        actions = [_select_patient_action(candidate) for candidate in patients]
        return tool_success(
            tool_name=self.name,
            data={
                "query": query,
                "match_status": payload.get("match_status", _match_status(patients)),
                "patients": patients,
                "actions": actions,
                "data_availability": payload.get("data_availability", {}),
            },
            message=f"Found {len(patients)} patient candidate(s).",
        )


@dataclass(frozen=True)
class DoctorPatientOverviewContextTool:
    patient_repository: PatientRepository
    db_connector: Any | None = None

    name: str = "clinical.doctor_patient_overview_context"
    description: str = "List and rank patients needing monitoring using alerts and vitals when available."

    async def run(self, request: ToolRequest, context: ToolContext | None = None):
        limit = int(request.arguments.get("limit", 10))
        directory_payload = self.patient_repository.list_patient_directory(limit=max(limit, 25))
        patients = directory_payload.get("patients", [])
        availability = {
            "patient_directory": directory_payload.get("data_availability", {}),
            "health_alerts": False,
            "clean_vitals": False,
            "notes": list((directory_payload.get("data_availability") or {}).get("notes") or []),
        }

        alerts_by_patient: dict[str, list[dict[str, Any]]] = {}
        vitals_by_patient: dict[str, dict[str, Any]] = {}
        if self.db_connector is not None and patients:
            patient_ids = [str(patient["patient_id"]) for patient in patients if patient.get("patient_id")]
            alerts_by_patient, alert_notes = _fetch_alerts(self.db_connector, patient_ids)
            vitals_by_patient, vitals_notes = _fetch_latest_vitals(self.db_connector, patient_ids)
            availability["health_alerts"] = bool(alerts_by_patient)
            availability["clean_vitals"] = bool(vitals_by_patient)
            availability["notes"].extend(alert_notes)
            availability["notes"].extend(vitals_notes)
        else:
            availability["notes"].append("No database connector is available for alert/vitals overview.")

        ranked = []
        for patient in patients:
            patient_id = str(patient.get("patient_id") or patient.get("subject_id"))
            alerts = alerts_by_patient.get(patient_id) or patient.get("recent_alerts") or []
            latest_vitals = vitals_by_patient.get(patient_id)
            abnormal_indicators = _abnormal_indicators(latest_vitals)
            risk_score = _risk_score(alerts=alerts, abnormal_indicators=abnormal_indicators)
            ranked.append(
                {
                    **patient,
                    "risk_score": risk_score,
                    "risk_level": _risk_level(risk_score),
                    "open_alerts": alerts[:3],
                    "abnormal_indicators": abnormal_indicators,
                    "actions": [_select_patient_action(patient)],
                }
            )

        ranked.sort(key=lambda item: (-item["risk_score"], item.get("hospital_patient_code") or item.get("patient_id") or ""))
        selected = ranked[:limit]
        actions = [_select_patient_action(patient) for patient in selected]
        return tool_success(
            tool_name=self.name,
            data={
                "patients": selected,
                "actions": actions,
                "data_availability": availability,
            },
            message=f"Ranked {len(selected)} patient candidate(s).",
        )


def _lookup_query(arguments: dict[str, Any]) -> str:
    for key in ("hospital_patient_code", "subject_id", "patient_id", "query"):
        value = arguments.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _match_status(patients: list[dict[str, Any]]) -> str:
    if not patients:
        return "none"
    if len(patients) == 1:
        return "single"
    return "multiple"


def _select_patient_action(candidate: dict[str, Any]) -> dict[str, Any]:
    patient_id = str(candidate.get("patient_id") or candidate.get("subject_id") or "")
    label_name = candidate.get("display_name") or f"Patient {patient_id}"
    return {
        "type": "select_patient_for_chat",
        "label": "Mo benh nhan nay",
        "patient_id": patient_id,
        "hospital_patient_code": candidate.get("hospital_patient_code"),
        "display_name": label_name,
    }


def _table_exists(conn: Any, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s) AS table_ref", (f"public.{table_name}",))
        row = cur.fetchone()
    return bool(row and row.get("table_ref"))


def _fetch_alerts(db_connector: Any, patient_ids: list[str]) -> tuple[dict[str, list[dict[str, Any]]], list[str]]:
    try:
        with db_connector.connection() as conn:
            table_name = "health_alerts"
            timestamp_col = "timestamp"
            message_col = "message"
            
            if not _table_exists(conn, "health_alerts"):
                if _table_exists(conn, "alerts"):
                    table_name = "alerts"
                    timestamp_col = "alert_time"
                    message_col = "reason"
                else:
                    return {}, ["Neither health_alerts nor alerts table is available."]
            
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT alert_id, patient_id::text AS patient_id, severity, 
                           {message_col} AS message, {timestamp_col} AS timestamp
                    FROM {table_name}
                    WHERE patient_id::text = ANY(%s)
                    ORDER BY {timestamp_col} DESC
                    LIMIT 100
                    """,
                    (patient_ids,),
                )
                rows = cur.fetchall()
    except Exception as exc:
        return {}, [f"health_alerts could not be queried: {exc}"]

    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        patient_id = str(row.get("patient_id"))
        grouped.setdefault(patient_id, []).append(
            {
                "alert_id": row.get("alert_id"),
                "severity": row.get("severity"),
                "message": row.get("message"),
                "timestamp": row.get("timestamp").isoformat() if row.get("timestamp") else None,
            }
        )
    return grouped, [] if grouped else ["No recent health alerts were found."]


def _fetch_latest_vitals(db_connector: Any, patient_ids: list[str]) -> tuple[dict[str, dict[str, Any]], list[str]]:
    try:
        with db_connector.connection() as conn:
            if not _table_exists(conn, "clean_vitals"):
                return {}, ["clean_vitals table is unavailable."]
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT DISTINCT ON (patient_id)
                        patient_id::text AS patient_id,
                        timestamp,
                        heart_rate,
                        spo2,
                        systolic_bp,
                        diastolic_bp
                    FROM clean_vitals
                    WHERE patient_id::text = ANY(%s)
                    ORDER BY patient_id, timestamp DESC
                    """,
                    (patient_ids,),
                )
                rows = cur.fetchall()
    except Exception as exc:
        return {}, [f"clean_vitals could not be queried: {exc}"]

    latest = {
        str(row["patient_id"]): {
            "timestamp": row.get("timestamp").isoformat() if row.get("timestamp") else None,
            "heart_rate": row.get("heart_rate"),
            "spo2": row.get("spo2"),
            "systolic_bp": row.get("systolic_bp"),
            "diastolic_bp": row.get("diastolic_bp"),
        }
        for row in rows
    }
    return latest, [] if latest else ["No recent clean_vitals rows were found."]


def _abnormal_indicators(vitals: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not vitals:
        return []
    indicators = []
    checks = [
        ("heart_rate", vitals.get("heart_rate"), "bpm", lambda value: value > 120 or value < 50),
        ("spo2", vitals.get("spo2"), "%", lambda value: value < 90),
        ("systolic_bp", vitals.get("systolic_bp"), "mmHg", lambda value: value > 160 or value < 80),
        ("diastolic_bp", vitals.get("diastolic_bp"), "mmHg", lambda value: value > 100 or value < 50),
    ]
    for metric, value, unit, is_abnormal in checks:
        if value is None:
            continue
        if is_abnormal(float(value)):
            indicators.append(
                {
                    "metric": metric,
                    "value": value,
                    "unit": unit,
                    "status": "ABNORMAL",
                    "timestamp": vitals.get("timestamp"),
                }
            )
    return indicators


def _risk_score(*, alerts: list[dict[str, Any]], abnormal_indicators: list[dict[str, Any]]) -> int:
    alert_score = sum(SEVERITY_RANK.get(str(alert.get("severity", "")).upper(), 1) for alert in alerts[:5])
    return alert_score + (2 * len(abnormal_indicators))


def _risk_level(score: int) -> str:
    if score >= 5:
        return "critical"
    if score >= 2:
        return "warning"
    return "unknown"
