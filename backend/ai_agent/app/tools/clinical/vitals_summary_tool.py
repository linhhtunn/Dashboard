from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.contracts import ToolResponse, tool_error, tool_not_found, tool_success
from app.tools.base import ToolContext, ToolRequest
from app.tools.clinical.patient_context_tool import _resolve_patient_id

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VitalsSummaryTool:
    db_connector: Any | None = None
    name: str = "clinical.get_patient_vitals_summary"
    description: str = (
        "Fetch aggregated and downsampled vital signs (heart rate, SpO2, blood pressure) "
        "over a specified time window to evaluate trends."
    )

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(
                tool_name=self.name,
                message="patient_id is required",
            )

        # Parse parameters with defaults
        try:
            time_window_minutes = int(request.arguments.get("time_window_minutes", 30))
            user_interval = request.arguments.get("interval_seconds")
            if user_interval is not None:
                interval_seconds = int(user_interval)
            else:
                # Apply adaptive downsampling rules
                if time_window_minutes <= 15:
                    interval_seconds = 5
                elif time_window_minutes <= 60:
                    interval_seconds = 10
                else:
                    interval_seconds = 60
        except ValueError as exc:
            return tool_error(
                tool_name=self.name,
                message=f"Invalid parameter values: {exc}",
            )

        # Fallback to mock data if PostgreSQL DSN is not provided / mock mode
        if self.db_connector is None:
            logger.info("postgres_connector_absent falling_back_to_fixture patient_id=%s", patient_id)
            try:
                from app.fixtures.clinical import get_patient_fixture
                patient = get_patient_fixture(patient_id)
                vitals = patient.get("recent_vitals", [])
                
                # Mock response format mirroring DB fields
                summary = [
                    {
                        "time_bucket": v.get("timestamp"),
                        "avg_heart_rate": v.get("heart_rate"),
                        "min_heart_rate": v.get("heart_rate"),
                        "max_heart_rate": v.get("heart_rate"),
                        "avg_spo2": v.get("spo2"),
                        "min_spo2": v.get("spo2"),
                        "max_spo2": v.get("spo2"),
                        "avg_systolic_bp": v.get("systolic_bp"),
                        "min_systolic_bp": v.get("systolic_bp"),
                        "max_systolic_bp": v.get("systolic_bp"),
                        "avg_diastolic_bp": v.get("diastolic_bp"),
                        "min_diastolic_bp": v.get("diastolic_bp"),
                        "max_diastolic_bp": v.get("diastolic_bp")
                    }
                    for v in vitals
                ]
                return tool_success(
                    tool_name=self.name,
                    data={
                        "patient_id": patient_id,
                        "time_window_minutes": time_window_minutes,
                        "interval_seconds": interval_seconds,
                        "summary": summary
                    }
                )
            except Exception as exc:
                return tool_not_found(
                    tool_name=self.name,
                    message=f"Patient {patient_id} not found in fixtures: {exc}",
                )

        # Database Query execution
        try:
            with self.db_connector.connection() as conn:
                # 1. Fetch latest timestamp for the patient to anchor our lookback window
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT MAX(timestamp) FROM clean_vitals WHERE patient_id = %s",
                        (patient_id,),
                    )
                    row = cur.fetchone()
                    # psycopg v3 dict_row returns a dict or None/row as dict.
                    # Wait! In psycopg dict_row, cur.fetchone() returns a dict, so we must access it as key or get 'max' depending on SQL result column name.
                    # Let's write the SQL explicitly using an alias `max_ts` to be safe!
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT MAX(timestamp) AS max_ts FROM clean_vitals WHERE patient_id = %s",
                        (patient_id,),
                    )
                    row = cur.fetchone()
                    end_time = row.get("max_ts") if row and row.get("max_ts") else datetime.now(timezone.utc)

                # 2. Query downsampled / bucketed metrics
                # epoch bucketing syntax: floor(extract(epoch from timestamp) / interval) * interval
                sql = """
                    SELECT 
                        to_timestamp(floor(extract(epoch from timestamp) / %s) * %s) AT TIME ZONE 'UTC' AS time_bucket,
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
                    FROM clean_vitals
                    WHERE patient_id = %s
                      AND timestamp >= %s - %s * INTERVAL '1 minute'
                      AND timestamp <= %s
                    GROUP BY time_bucket
                    ORDER BY time_bucket DESC
                    LIMIT %s
                """
                
                # Enforce a hard limit of 200 data points
                limit = 200
                
                params = (
                    interval_seconds,
                    interval_seconds,
                    patient_id,
                    end_time,
                    time_window_minutes,
                    end_time,
                    limit,
                )
                
                with conn.cursor() as cur:
                    cur.execute(sql, params)
                    rows = cur.fetchall()

            summary = []
            for r in rows:
                r_dict = dict(r)
                bucket_ts = r_dict["time_bucket"]
                r_dict["time_bucket"] = bucket_ts.strftime("%Y-%m-%dT%H:%M:%SZ") if bucket_ts else None
                summary.append(r_dict)

            return tool_success(
                tool_name=self.name,
                data={
                    "patient_id": patient_id,
                    "time_window_minutes": time_window_minutes,
                    "interval_seconds": interval_seconds,
                    "summary": summary
                }
            )

        except Exception as exc:
            logger.error("database_query_error patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            return tool_error(
                tool_name=self.name,
                message=f"Failed to query database for vitals summary: {exc}"
            )
