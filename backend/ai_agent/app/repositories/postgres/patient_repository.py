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
