from __future__ import annotations

import logging
from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.repositories.postgres.patient_repository import determine_status

logger = logging.getLogger(__name__)


class PostgresAlertRepository:
    def __init__(self, db_connector: Any) -> None:
        self.db_connector = db_connector

    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        logger.info("fetching_alert_from_db alert_id=%s", alert_id)
        
        try:
            with self.db_connector.connection() as conn:
                # 1. Query alert basic info
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT alert_id, patient_id, timestamp, alert_type, health_status, severity, confidence, evidence, message
                        FROM health_alerts
                        WHERE alert_id = %s
                        """,
                        (alert_id,),
                    )
                    alert_row = cur.fetchone()
                
                if not alert_row:
                    raise RepositoryItemNotFoundError(f"Alert with ID {alert_id} not found in database")
                
                alert_data = dict(alert_row)
                
                # Format alert timestamp
                ts = alert_data["timestamp"]
                alert_data["timestamp"] = ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None

                patient_id = alert_data["patient_id"]

                # 2. Query sensor context around the alert's timestamp (+- 5 minutes)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT timestamp, heart_rate, spo2, systolic_bp, diastolic_bp, acc_magnitude, gyro_magnitude
                        FROM clean_vitals
                        WHERE patient_id = %s
                          AND timestamp >= %s - INTERVAL '5 minutes'
                          AND timestamp <= %s + INTERVAL '1 minute'
                        ORDER BY timestamp ASC
                        """,
                        (patient_id, ts, ts),
                    )
                    sensor_rows = cur.fetchall()
                
                sensor_context = []
                for row in sensor_rows:
                    row_dict = dict(row)
                    vital_ts = row_dict["timestamp"]
                    
                    sensor_context.append({
                        "timestamp": vital_ts.strftime("%Y-%m-%dT%H:%M:%SZ") if vital_ts else None,
                        "heart_rate": row_dict.get("heart_rate"),
                        "spo2": row_dict.get("spo2"),
                        "systolic_bp": row_dict.get("systolic_bp"),
                        "diastolic_bp": row_dict.get("diastolic_bp"),
                        "acc_magnitude": row_dict.get("acc_magnitude"),
                        "movement_level": row_dict.get("gyro_magnitude"),
                        "status": determine_status(
                            hr=row_dict.get("heart_rate"),
                            spo2=row_dict.get("spo2"),
                            sys_bp=row_dict.get("systolic_bp"),
                            dia_bp=row_dict.get("diastolic_bp")
                        )
                    })
                
                alert_data["sensor_context"] = sensor_context
                
                return alert_data

        except RepositoryItemNotFoundError:
            raise
        except Exception as exc:
            logger.error("database_query_error alert_id=%s reason=%s", alert_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def list_open(self) -> list[dict[str, Any]]:
        logger.info("listing_open_alerts_from_db")
        try:
            with self.db_connector.connection() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT alert_id, patient_id, alert_type, severity, confidence, evidence, message, timestamp
                    FROM health_alerts
                    ORDER BY timestamp DESC
                    LIMIT 50
                    """
                )
                rows = cur.fetchall()

            return [
                {
                    "id": row["alert_id"],
                    "patient_id": row["patient_id"],
                    "type": row["alert_type"],
                    "severity": str(row["severity"]).lower(),
                    "score": round(float(row["confidence"] or 0) * 10, 1),
                    "timestamp": row["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ") if row["timestamp"] else None,
                    "acknowledged": False,
                    "message": row["message"],
                    "evidence": row["evidence"] or [],
                }
                for row in rows
            ]
        except Exception as exc:
            logger.error("database_query_error alert_list reason=%s", exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def list_by_patient(self, patient_id: str) -> list[dict[str, Any]]:
        return [item for item in self.list_open() if item["patient_id"] == patient_id]
