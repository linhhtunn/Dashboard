from __future__ import annotations

import logging
from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError

logger = logging.getLogger(__name__)


def determine_status(hr: float | None, spo2: float | None, sys_bp: float | None, dia_bp: float | None) -> str:
    if spo2 is not None and spo2 < 90:
        return "ABNORMAL"
    if hr is not None and (hr > 120 or hr < 50):
        return "ABNORMAL"
    if sys_bp is not None and (sys_bp > 160 or sys_bp < 80):
        return "ABNORMAL"
    if dia_bp is not None and (dia_bp > 100 or dia_bp < 50):
        return "ABNORMAL"
        
    if spo2 is not None and spo2 < 95:
        return "WARNING"
    if hr is not None and (hr > 100 or hr < 60):
        return "WARNING"
    if sys_bp is not None and (sys_bp > 140 or sys_bp < 90):
        return "WARNING"
    if dia_bp is not None and (dia_bp > 90 or dia_bp < 60):
        return "WARNING"
        
    return "NORMAL"


class PostgresPatientRepository:
    def __init__(self, db_connector: Any) -> None:
        self.db_connector = db_connector

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        logger.info("fetching_patient_from_db patient_id=%s", patient_id)
        
        try:
            with self.db_connector.connection() as conn:
                # 1. Fetch Patient Info
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT patient_id, name, age, gender, medical_history, health_status
                        FROM patients
                        WHERE patient_id = %s
                        """,
                        (patient_id,),
                    )
                    patient_row = cur.fetchone()
                
                if not patient_row:
                    raise RepositoryItemNotFoundError(f"Patient with ID {patient_id} not found in database")
                
                patient_data = dict(patient_row)

                # 2. Fetch Recent Alerts
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT alert_id, alert_type, severity, confidence, message
                        FROM health_alerts
                        WHERE patient_id = %s
                        ORDER BY timestamp DESC
                        LIMIT 5
                        """,
                        (patient_id,),
                    )
                    alerts = [dict(row) for row in cur.fetchall()]
                patient_data["recent_alerts"] = alerts

                # 3. Fetch Recent Vitals joined with raw_vitals to get activity_state
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 
                            c.timestamp, c.heart_rate, c.hrv_rmssd AS hrv, 
                            c.systolic_bp, c.diastolic_bp, c.spo2,
                            r.raw_payload->>'activity_state' AS activity_state
                        FROM clean_vitals c
                        LEFT JOIN raw_vitals r 
                          ON c.patient_id = r.patient_id AND c.timestamp = r.timestamp
                        WHERE c.patient_id = %s
                        ORDER BY c.timestamp DESC
                        LIMIT 5
                        """,
                        (patient_id,),
                    )
                    vitals_rows = cur.fetchall()

                recent_vitals = []
                for row in vitals_rows:
                    row_dict = dict(row)
                    ts = row_dict["timestamp"]
                    row_dict["timestamp"] = ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None
                    
                    # Compute status
                    row_dict["status"] = determine_status(
                        hr=row_dict.get("heart_rate"),
                        spo2=row_dict.get("spo2"),
                        sys_bp=row_dict.get("systolic_bp"),
                        dia_bp=row_dict.get("diastolic_bp")
                    )
                    recent_vitals.append(row_dict)
                
                patient_data["recent_vitals"] = recent_vitals
                
                return patient_data

        except RepositoryItemNotFoundError:
            raise
        except Exception as exc:
            logger.error("database_query_error patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def list(self, *, query: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        logger.info("listing_patients_from_db query=%s status=%s", query, status)
        try:
            with self.db_connector.connection() as conn:
                sql = """
                    SELECT patient_id, name, age, gender, medical_history, health_status
                    FROM patients
                """
                clauses = []
                params: list[Any] = []
                if query:
                    clauses.append("(patient_id ILIKE %s OR name ILIKE %s)")
                    params.extend([f"%{query}%", f"%{query}%"])
                if status:
                    clauses.append("health_status = %s")
                    params.append(status.upper())
                if clauses:
                    sql += " WHERE " + " AND ".join(clauses)
                sql += " ORDER BY patient_id ASC"

                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()

            return [
                {
                    "patient_id": row["patient_id"],
                    "name": row["name"],
                    "age": row["age"],
                    "gender": row["gender"],
                    "medical_history": row["medical_history"],
                    "health_status": row["health_status"],
                }
                for row in rows
            ]
        except Exception as exc:
            logger.error("database_query_error patient_list reason=%s", exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def get_vitals(self, patient_id: str, *, time_range: str = "15m") -> list[dict[str, Any]]:
        logger.info("fetching_vitals_from_db patient_id=%s time_range=%s", patient_id, time_range)
        try:
            with self.db_connector.connection() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT timestamp, heart_rate, hrv_rmssd, systolic_bp, diastolic_bp, spo2
                    FROM clean_vitals
                    WHERE patient_id = %s
                    ORDER BY timestamp ASC
                    LIMIT 50
                    """,
                    (patient_id,),
                )
                rows = cur.fetchall()

            if not rows:
                raise RepositoryItemNotFoundError(f"No vitals found for patient {patient_id}")

            return [
                {
                    "patient_id": patient_id,
                    "timestamp": row["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ") if row["timestamp"] else None,
                    "heart_rate": row["heart_rate"],
                    "hrv_rmssd": row["hrv_rmssd"],
                    "systolic_bp": row["systolic_bp"],
                    "diastolic_bp": row["diastolic_bp"],
                    "spo2": row["spo2"],
                }
                for row in rows
            ]
        except RepositoryItemNotFoundError:
            raise
        except Exception as exc:
            logger.error("database_query_error vitals patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def get_metric_summaries(self, patient_id: str) -> list[dict[str, Any]]:
        vitals = self.get_vitals(patient_id, time_range="15m")
        if not vitals:
            raise RepositoryItemNotFoundError(f"No vitals found for patient {patient_id}")

        ordered = vitals
        latest = ordered[-1]
        previous = ordered[-2] if len(ordered) > 1 else latest

        def avg(values: list[float]) -> int:
            return round(sum(values) / len(values))

        def delta(current: float, baseline: float) -> int:
            if baseline == 0:
                return 0
            return round(((current - baseline) / baseline) * 100)

        def build(metric: str, key: str, unit: str) -> dict[str, Any]:
            current = latest[key]
            baseline = previous[key]
            change_pct = delta(current, baseline)
            return {
                "metric": metric,
                "current_value": current,
                "unit": unit,
                "average_15m": avg([item[key] for item in ordered]),
                "trend": "stable" if change_pct == 0 else "up" if change_pct > 0 else "down",
                "change_pct": change_pct,
                "status": determine_status(
                    hr=current if metric == "heart_rate" else None,
                    spo2=current if metric == "spo2" else None,
                    sys_bp=current if metric == "systolic_bp" else None,
                    dia_bp=current if metric == "diastolic_bp" else None,
                ),
            }

        return [
            build("heart_rate", "heart_rate", "bpm"),
            build("hrv_rmssd", "hrv_rmssd", "ms"),
            build("spo2", "spo2", "%"),
            build("systolic_bp", "systolic_bp", "mmHg"),
            build("diastolic_bp", "diastolic_bp", "mmHg"),
        ]
