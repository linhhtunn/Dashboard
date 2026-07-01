from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from psycopg2.extras import RealDictCursor

from database.clients import TimescaleClient
from database.config import DatabaseConfig, load_database_config
from database.repositories.sql_helpers import execute_batch_insert, rows_from_models
from database.schemas.timeseries import (
    ActivityTimelineSegment,
    DailyHrvMetrics,
    EcgMeasurement,
    HealthFeature,
    LatestSensorValue,
    MotionBatch,
    PpiPatch,
    RawSensorEvent,
    SleepSession,
    SleepStageInterval,
    WearableContinuous,
    WearableInterval,
    WearableMeasurement,
)


class TimescaleRepository:
    """Batch insert/query operations for TigerData/TimescaleDB."""

    def __init__(self, client: TimescaleClient | None = None, config: DatabaseConfig | None = None) -> None:
        self._config = config or load_database_config()
        self._client = client or TimescaleClient(self._config)

    def clean_patient_timeseries(self, patient_id: str) -> None:
        """Delete all time-series rows for a patient before re-seeding."""
        tables = [
            "wearable_continuous",
            "wearable_intervals",
            "ppi_patches",
            "wearable_measurements",
            "motion_batches",
            "ecg_measurements",
            "activity_timeline_segments",
            "daily_hrv_metrics",
            "health_features",
        ]
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                for table in tables:
                    cur.execute(f"DELETE FROM public.{table} WHERE patient_id = %s", (patient_id,))
                # sleep_sessions cascades to sleep_stage_intervals
                cur.execute("DELETE FROM public.sleep_sessions WHERE patient_id = %s", (patient_id,))

    def insert_raw_events(self, events: Sequence[RawSensorEvent]) -> int:
        columns = ("time", "received_at", "message_id", "patient_id", "device_id", "stream_name", "event_type", "trigger_type", "raw_payload")
        rows = rows_from_models(events, columns)
        conflict = "ON CONFLICT DO NOTHING"
        return self._batch_insert("raw_sensor_events", columns, rows, conflict)

    def insert_wearable_continuous(self, samples: Sequence[WearableContinuous]) -> int:
        columns = ("time", "received_at", "message_id", "patient_id", "device_id", "heart_rate", "respiratory_rate")
        rows = rows_from_models(samples, columns)
        conflict = "ON CONFLICT (time, message_id) DO NOTHING"
        return self._batch_insert("wearable_continuous", columns, rows, conflict)

    def insert_wearable_intervals(self, intervals: Sequence[WearableInterval]) -> int:
        columns = (
            "time",
            "window_start",
            "window_end",
            "received_at",
            "message_id",
            "patient_id",
            "device_id",
            "interval_type",
            "interval_seconds",
            "steps_count",
            "steps_rate_per_min",
            "activity_type",
            "stress_score",
            "stress_level",
        )
        rows = rows_from_models(intervals, columns)
        conflict = "ON CONFLICT (time, message_id) DO NOTHING"
        return self._batch_insert("wearable_intervals", columns, rows, conflict)

    def insert_ppi_patches(self, patches: Sequence[PpiPatch]) -> int:
        columns = ("time", "window_start", "window_end", "received_at", "message_id", "patient_id", "device_id", "interval_seconds", "ppi_intervals_ms")
        rows = rows_from_models(patches, columns)
        conflict = "ON CONFLICT (time, message_id) DO NOTHING"
        return self._batch_insert("ppi_patches", columns, rows, conflict)

    def insert_wearable_measurements(self, measurements: Sequence[WearableMeasurement]) -> int:
        columns = ("time", "received_at", "message_id", "patient_id", "device_id", "measurement_type", "systolic_bp", "diastolic_bp", "spo2", "battery_level")
        rows = rows_from_models(measurements, columns)
        conflict = "ON CONFLICT (time, message_id) DO NOTHING"
        return self._batch_insert("wearable_measurements", columns, rows, conflict)

    def insert_motion_batches(self, batches: Sequence[MotionBatch]) -> int:
        columns = ("time", "window_start", "window_end", "received_at", "message_id", "patient_id", "device_id", "motion_sampling_rate_hz", "motion_points")
        rows = rows_from_models(batches, columns)
        conflict = "ON CONFLICT (window_start, message_id) DO NOTHING"
        return self._batch_insert("motion_batches", columns, rows, conflict)

    def insert_ecg_measurements(self, measurements: Sequence[EcgMeasurement]) -> int:
        columns = (
            "measurement_id",
            "time",
            "received_at",
            "message_id",
            "patient_id",
            "device_id",
            "ecg_result",
            "ecg_rhythm",
            "ecg_abnormal_flags",
            "ecg_lead",
            "ecg_unit",
            "ecg_sampling_rate_hz",
            "ecg_duration_seconds",
            "ecg_points",
        )
        rows = rows_from_models(measurements, columns)
        conflict = "ON CONFLICT (measurement_id) DO NOTHING"
        return self._batch_insert("ecg_measurements", columns, rows, conflict)

    def upsert_sleep_sessions(self, sessions: Sequence[SleepSession]) -> int:
        columns = ("sleep_session_id", "patient_id", "device_id", "sleep_date", "start_time", "end_time", "sleep_duration_min", "sleep_score", "sleep_quality", "detail")
        rows = rows_from_models(sessions, columns)
        conflict = """
        ON CONFLICT (sleep_session_id) DO UPDATE SET
          end_time = EXCLUDED.end_time,
          sleep_duration_min = EXCLUDED.sleep_duration_min,
          sleep_score = EXCLUDED.sleep_score,
          sleep_quality = EXCLUDED.sleep_quality,
          detail = EXCLUDED.detail
        """
        return self._batch_insert("sleep_sessions", columns, rows, conflict)

    def upsert_sleep_stage_intervals(self, stages: Sequence[SleepStageInterval]) -> int:
        columns = ("stage_id", "sleep_session_id", "patient_id", "device_id", "start_time", "end_time", "state", "duration_min")
        rows = rows_from_models(stages, columns)
        conflict = """
        ON CONFLICT (stage_id) DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          state = EXCLUDED.state,
          duration_min = EXCLUDED.duration_min
        """
        return self._batch_insert("sleep_stage_intervals", columns, rows, conflict)

    def upsert_daily_hrv_metrics(self, metrics: Sequence[DailyHrvMetrics]) -> int:
        columns = ("patient_id", "date", "measured_at", "hrv_rmssd_morning")
        rows = rows_from_models(metrics, columns)
        conflict = """
        ON CONFLICT (patient_id, date) DO UPDATE SET
          measured_at = EXCLUDED.measured_at,
          hrv_rmssd_morning = EXCLUDED.hrv_rmssd_morning
        """
        return self._batch_insert("daily_hrv_metrics", columns, rows, conflict)

    def insert_activity_timeline_segments(self, segments: Sequence[ActivityTimelineSegment]) -> int:
        columns = ("time", "patient_id", "device_id", "kind", "state", "start_time", "end_time", "duration_minutes")
        rows = rows_from_models(segments, columns)
        conflict = "ON CONFLICT DO NOTHING"
        return self._batch_insert("activity_timeline_segments", columns, rows, conflict)

    def insert_health_features(self, features: Sequence[HealthFeature]) -> int:
        columns = (
            "time",
            "patient_id",
            "device_id",
            "feature_window",
            "source_window_start",
            "source_window_end",
            "avg_heart_rate",
            "max_heart_rate",
            "avg_respiratory_rate",
            "min_spo2",
            "avg_stress_score",
            "ppi_rmssd_ms_avg",
            "steps_count",
            "acc_magnitude_max",
            "gyro_magnitude_max",
            "anomaly_score",
            "features",
        )
        rows = rows_from_models(features, columns)
        conflict = "ON CONFLICT (time, patient_id, device_id, feature_window, source_window_start, source_window_end) DO NOTHING"
        return self._batch_insert("health_features", columns, rows, conflict)

    def upsert_latest_values(self, values: Sequence[LatestSensorValue]) -> int:
        columns = ("patient_id", "device_id", "metric", "value_numeric", "value_text", "unit", "last_measured_at", "received_at", "stream_name")
        rows = rows_from_models(values, columns)
        conflict = """
        ON CONFLICT (patient_id, device_id, metric) DO UPDATE SET
          value_numeric = EXCLUDED.value_numeric,
          value_text = EXCLUDED.value_text,
          unit = EXCLUDED.unit,
          last_measured_at = EXCLUDED.last_measured_at,
          received_at = EXCLUDED.received_at,
          stream_name = EXCLUDED.stream_name,
          updated_at = now()
        WHERE EXCLUDED.last_measured_at >= latest_sensor_values.last_measured_at
        """
        return self._batch_insert("latest_sensor_values", columns, rows, conflict)

    def fetch_latest_values(self, patient_id: str) -> list[dict[str, Any]]:
        sql = """
            SELECT *
            FROM latest_sensor_values
            WHERE patient_id = %s
            ORDER BY metric
        """
        return self._fetch_all(sql, (patient_id,))

    def fetch_continuous_window(self, patient_id: str, start: datetime, end: datetime, *, limit: int = 5000) -> list[dict[str, Any]]:
        sql = """
            SELECT time, device_id, heart_rate, respiratory_rate
            FROM wearable_continuous
            WHERE patient_id = %s
              AND time >= %s
              AND time < %s
            ORDER BY time ASC
            LIMIT %s
        """
        return self._fetch_all(sql, (patient_id, start, end, limit))

    def _batch_insert(self, table: str, columns: Sequence[str], rows: Sequence[tuple[Any, ...]], conflict: str) -> int:
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(
                    cur,
                    table=table,
                    columns=columns,
                    rows=rows,
                    conflict_sql=conflict,
                    page_size=self._config.timescale_batch_size,
                )
        return len(rows)

    def _fetch_all(self, sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        with self._client.connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                return [dict(row) for row in cur.fetchall()]
