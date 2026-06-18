from __future__ import annotations

import logging
from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.repositories.postgres.patient_repository import determine_status

logger = logging.getLogger(__name__)


class PostgresAlertRepository:
    def __init__(self, db_connector: Any, timescale_connector: Any | None = None) -> None:
        self.db_connector = db_connector
        self.timescale_connector = timescale_connector

    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        logger.info("fetching_alert_from_db alert_id=%s", alert_id)
        
        try:
            with self.db_connector.connection() as conn:
                from app.repositories.postgres.patient_repository import _table_exists
                
                query_sql = """
                    SELECT alert_id, patient_id, timestamp, alert_type, health_status, severity, confidence, evidence, message
                    FROM health_alerts
                    WHERE alert_id = %s
                """
                
                if not _table_exists(conn, "health_alerts") and _table_exists(conn, "alerts"):
                    query_sql = """
                        SELECT alert_id, patient_id, alert_time AS timestamp, alert_type, status AS health_status, severity, confidence, features AS evidence, reason AS message
                        FROM alerts
                        WHERE alert_id = %s
                    """

                # 1. Query alert basic info
                with conn.cursor() as cur:
                    cur.execute(query_sql, (alert_id,))
                    alert_row = cur.fetchone()
                
                if not alert_row:
                    raise RepositoryItemNotFoundError(f"Alert with ID {alert_id} not found in database")
                
                alert_data = dict(alert_row)
                
                # Format alert timestamp
                ts = alert_data["timestamp"]
                alert_data["timestamp"] = ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None

                patient_id = alert_data["patient_id"]

                # 2. Query sensor context around the alert's timestamp (+- 5 minutes)
                from app.repositories.timescale.vitals_repository import TimescaleVitalsRepository
                timescale_repo = TimescaleVitalsRepository(self.timescale_connector or self.db_connector)

                sensor_rows = timescale_repo.get_vitals_around_timestamp(
                    patient_id=patient_id,
                    timestamp=ts,
                    window_before_min=5,
                    window_after_min=1,
                )

                # Query sleep stage at alert timestamp
                sleep_stage = timescale_repo.get_sleep_stage(patient_id, ts)
                if sleep_stage:
                    alert_data["sleep_stage_context"] = f"Bệnh nhân đang ở trạng thái giấc ngủ: {sleep_stage}"
                else:
                    alert_data["sleep_stage_context"] = None

                sensor_context = []
                for row_dict in sensor_rows:
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

    def get_latest_alert_id_by_patient(self, patient_id: str) -> str | None:
        logger.info("fetching_latest_alert_id_for_patient patient_id=%s", patient_id)
        try:
            with self.db_connector.connection() as conn:
                from app.repositories.postgres.patient_repository import _table_exists
                
                table_name = "health_alerts"
                timestamp_col = "timestamp"
                
                if not _table_exists(conn, "health_alerts") and _table_exists(conn, "alerts"):
                    table_name = "alerts"
                    timestamp_col = "alert_time"
                
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT alert_id 
                        FROM {table_name}
                        WHERE patient_id::text = %s
                        ORDER BY {timestamp_col} DESC
                        LIMIT 1
                        """,
                        (patient_id,),
                    )
                    row = cur.fetchone()
                return row["alert_id"] if row else None
        except Exception as exc:
            logger.error("failed_to_get_latest_alert_id_for_patient patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def get_alerts_by_patient(self, patient_id: str, limit: int = 10) -> list[dict[str, Any]]:
        logger.info("fetching_alerts_from_db patient_id=%s limit=%s", patient_id, limit)
        try:
            with self.db_connector.connection() as conn:
                from app.repositories.postgres.patient_repository import _table_exists
                
                table_name = "health_alerts"
                query_sql = f"""
                    SELECT alert_id, patient_id, timestamp, alert_type, health_status, severity, confidence, evidence, message
                    FROM health_alerts
                    WHERE patient_id::text = %s
                    ORDER BY timestamp DESC
                    LIMIT %s
                """
                
                if not _table_exists(conn, "health_alerts") and _table_exists(conn, "alerts"):
                    query_sql = f"""
                        SELECT alert_id, patient_id, alert_time AS timestamp, alert_type, status AS health_status, severity, confidence, features AS evidence, reason AS message
                        FROM alerts
                        WHERE patient_id::text = %s
                        ORDER BY alert_time DESC
                        LIMIT %s
                    """

                with conn.cursor() as cur:
                    cur.execute(query_sql, (patient_id, limit))
                    rows = cur.fetchall()
                
                alerts = []
                for row in rows:
                    alert_data = dict(row)
                    ts = alert_data["timestamp"]
                    alert_data["timestamp"] = ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None
                    alerts.append(alert_data)
                
                return alerts
        except Exception as exc:
            logger.error("failed_to_get_alerts_for_patient patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc
