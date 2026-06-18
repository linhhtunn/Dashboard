from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


class TimescaleVitalsRepository:
    def __init__(self, db_connector: Any | None) -> None:
        self.db_connector = db_connector

    def get_vitals_summary(
        self,
        patient_id: str,
        time_window_minutes: int,
        interval_seconds: int,
        end_time: datetime,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        """Fetch aggregated and downsampled vital signs over a time window."""
        logger.info(
            "fetching_vitals_summary_from_timescale patient_id=%s window_min=%s interval_sec=%s",
            patient_id,
            time_window_minutes,
            interval_seconds,
        )
        if self.db_connector is None:
            logger.warning("timescale_connector_absent returning_empty_summary")
            return []

        sql = """
            WITH combined_vitals AS (
                SELECT 
                    time, 
                    patient_id, 
                    heart_rate,
                    NULL::integer AS spo2,
                    NULL::integer AS systolic_bp,
                    NULL::integer AS diastolic_bp
                FROM wearable_continuous
                WHERE patient_id = %s 
                  AND time >= %s - %s * INTERVAL '1 minute'
                  AND time <= %s

                UNION ALL

                SELECT 
                    time, 
                    patient_id, 
                    NULL::integer AS heart_rate,
                    spo2,
                    systolic_bp,
                    diastolic_bp
                FROM wearable_measurements
                WHERE patient_id = %s 
                  AND time >= %s - %s * INTERVAL '1 minute'
                  AND time <= %s
            )
            SELECT 
                time_bucket(make_interval(secs => %s), time) AS time_bucket,
                ROUND(AVG(heart_rate)::numeric, 1)::float AS avg_heart_rate,
                ROUND(MIN(heart_rate)::numeric, 1)::float AS min_heart_rate,
                ROUND(MAX(heart_rate)::numeric, 1)::float AS max_heart_rate,
                
                ROUND(AVG(spo2)::numeric, 1)::float AS avg_spo2,
                ROUND(MIN(spo2)::numeric, 1)::float AS min_spo2,
                ROUND(MAX(spo2)::numeric, 1)::float AS max_spo2,
                
                ROUND(AVG(systolic_bp)::numeric, 1)::float AS avg_systolic_bp,
                ROUND(MIN(systolic_bp)::numeric, 1)::float AS min_systolic_bp,
                ROUND(MAX(systolic_bp)::numeric, 1)::float AS max_systolic_bp,
                
                ROUND(AVG(diastolic_bp)::numeric, 1)::float AS avg_diastolic_bp,
                ROUND(MIN(diastolic_bp)::numeric, 1)::float AS min_diastolic_bp,
                ROUND(MAX(diastolic_bp)::numeric, 1)::float AS max_diastolic_bp
            FROM combined_vitals
            GROUP BY time_bucket
            ORDER BY time_bucket DESC
            LIMIT %s;
        """
        params = (
            patient_id,
            end_time,
            time_window_minutes,
            end_time,
            patient_id,
            end_time,
            time_window_minutes,
            end_time,
            interval_seconds,
            limit,
        )

        try:
            with self.db_connector.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()
            
            summary = []
            for r in rows:
                r_dict = dict(r)
                bucket_ts = r_dict["time_bucket"]
                r_dict["time_bucket"] = bucket_ts.strftime("%Y-%m-%dT%H:%M:%SZ") if bucket_ts else None
                summary.append(r_dict)
            return summary
        except Exception as exc:
            logger.error("timescale_query_error patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"TimescaleDB query failed: {exc}") from exc

    def get_latest_timestamp(self, patient_id: str) -> datetime | None:
        """Fetch the latest measurement timestamp to anchor the lookback window."""
        if self.db_connector is None:
            return None
        try:
            with self.db_connector.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT GREATEST(
                            (SELECT MAX(last_measured_at) FROM latest_sensor_values WHERE patient_id = %s),
                            (SELECT MAX(time) FROM wearable_continuous WHERE patient_id = %s),
                            (SELECT MAX(time) FROM wearable_measurements WHERE patient_id = %s)
                        ) AS max_ts
                        """,
                        (patient_id, patient_id, patient_id),
                    )
                    row = cur.fetchone()
            return row.get("max_ts") if row and row.get("max_ts") else None
        except Exception as exc:
            logger.warning("failed_to_get_latest_timestamp patient_id=%s reason=%s", patient_id, exc)
            return None

    def get_vitals_around_timestamp(
        self,
        patient_id: str,
        timestamp: datetime,
        window_before_min: int = 5,
        window_after_min: int = 1,
    ) -> list[dict[str, Any]]:
        """Fetch raw sensor context (vitals) around a specific timestamp."""
        if self.db_connector is None:
            return []

        sql = """
            WITH combined_vitals AS (
                SELECT 
                    time AS timestamp, 
                    heart_rate,
                    NULL::integer AS spo2,
                    NULL::integer AS systolic_bp,
                    NULL::integer AS diastolic_bp
                FROM wearable_continuous
                WHERE patient_id = %s 
                  AND time >= %s - %s * INTERVAL '1 minute'
                  AND time <= %s + %s * INTERVAL '1 minute'

                UNION ALL

                SELECT 
                    time AS timestamp, 
                    NULL::integer AS heart_rate,
                    spo2,
                    systolic_bp,
                    diastolic_bp
                FROM wearable_measurements
                WHERE patient_id = %s 
                  AND time >= %s - %s * INTERVAL '1 minute'
                  AND time <= %s + %s * INTERVAL '1 minute'
            )
            SELECT 
                timestamp,
                ROUND(AVG(heart_rate)::numeric, 1)::float AS heart_rate,
                ROUND(AVG(spo2)::numeric, 1)::float AS spo2,
                ROUND(AVG(systolic_bp)::numeric, 1)::float AS systolic_bp,
                ROUND(AVG(diastolic_bp)::numeric, 1)::float AS diastolic_bp
            FROM combined_vitals
            GROUP BY timestamp
            ORDER BY timestamp ASC;
        """
        params = (
            patient_id,
            timestamp,
            window_before_min,
            timestamp,
            window_after_min,
            patient_id,
            timestamp,
            window_before_min,
            timestamp,
            window_after_min,
        )

        try:
            with self.db_connector.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()
            return [dict(r) for r in rows]
        except Exception as exc:
            logger.error("failed_to_query_vitals_around_timestamp reason=%s", exc)
            return []

    def get_sleep_stage(self, patient_id: str, timestamp: datetime) -> str | None:
        """Fetch the sleep stage of a patient at a specific timestamp."""
        if self.db_connector is None:
            return None
        sql = """
            SELECT state
            FROM sleep_stage_intervals
            WHERE patient_id = %s
              AND start_time <= %s
              AND end_time >= %s
            LIMIT 1;
        """
        try:
            with self.db_connector.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (patient_id, timestamp, timestamp))
                    row = cur.fetchone()
            return row["state"] if row else None
        except Exception as exc:
            logger.warning("failed_to_query_sleep_stage reason=%s", exc)
            return None
