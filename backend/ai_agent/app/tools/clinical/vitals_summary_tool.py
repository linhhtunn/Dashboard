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
    timescale_connector: Any | None = None
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
            from app.repositories.timescale.vitals_repository import TimescaleVitalsRepository
            timescale_repo = TimescaleVitalsRepository(self.timescale_connector or self.db_connector)

            # 1. Fetch latest timestamp for the patient to anchor our lookback window
            end_time = timescale_repo.get_latest_timestamp(patient_id)
            if not end_time:
                end_time = datetime.now(timezone.utc)

            # 2. Query downsampled / bucketed metrics
            summary = timescale_repo.get_vitals_summary(
                patient_id=patient_id,
                time_window_minutes=time_window_minutes,
                interval_seconds=interval_seconds,
                end_time=end_time,
                limit=200,
            )

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
                message=f"Failed to query database for vitals summary: {exc}",
                data={
                    "patient_id": patient_id,
                    "time_window_minutes": time_window_minutes,
                    "interval_seconds": interval_seconds,
                    "summary": [],
                    "data_availability": {
                        "clean_vitals": "unavailable",
                        "reason": str(exc),
                    },
                },
            )
