from __future__ import annotations

from time import perf_counter
from typing import Any, Sequence

from psycopg2.extras import Json

from database.clients import SupabaseDbClient
from database.repositories.sql_helpers import execute_batch_insert, rows_from_models
from database.schemas.app import (
    AbnormalEpisodeLog,
    AlertContextCreate,
    AlertCreate,
    DeviceCreate,
    DeviceSensorCreate,
    PatientCreate,
    PatientLabResultCreate,
    WearableFaultLog,
)

try:
    from observability.metrics import inc_error, observe_db_insert
except Exception:  # pragma: no cover - repository can be used without observability deps
    def inc_error(*_args: Any, **_kwargs: Any) -> None:
        return

    def observe_db_insert(*_args: Any, **_kwargs: Any) -> None:
        return


class SupabaseAppRepository:
    """DB operations for Supabase app/business tables."""

    def __init__(self, client: SupabaseDbClient | None = None) -> None:
        self._client = client or SupabaseDbClient()

    def list_patients(self, *, limit: int = 100, offset: int = 0, status: str | None = "active") -> list[dict[str, Any]]:
        sql = """
            SELECT *
            FROM public.patients
            WHERE (%s IS NULL OR status = %s)
            ORDER BY patient_id
            LIMIT %s OFFSET %s
        """
        return self._client.fetch_all(sql, (status, status, limit, offset))

    def get_patient(self, patient_id: str) -> dict[str, Any] | None:
        sql = """
            SELECT *
            FROM public.patients
            WHERE patient_id = %s
            LIMIT 1
        """
        rows = self._client.fetch_all(sql, (patient_id,))
        return rows[0] if rows else None

    def upsert_patients(self, patients: Sequence[PatientCreate]) -> int:
        columns = (
            "patient_id",
            "mimic_subject_id",
            "name",
            "age",
            "height_cm",
            "weight_kg",
            "gender",
            "age_group",
            "pregnancy_status",
            "lifestyle",
            "risk_factors",
            "activity_level",
            "medical_history",
            "health_status",
            "baseline_signals",
            "status",
        )
        rows = rows_from_models(patients, columns)
        conflict = """
        ON CONFLICT (patient_id) DO UPDATE SET
          mimic_subject_id = EXCLUDED.mimic_subject_id,
          name = EXCLUDED.name,
          age = EXCLUDED.age,
          height_cm = EXCLUDED.height_cm,
          weight_kg = EXCLUDED.weight_kg,
          gender = EXCLUDED.gender,
          age_group = EXCLUDED.age_group,
          pregnancy_status = EXCLUDED.pregnancy_status,
          lifestyle = EXCLUDED.lifestyle,
          risk_factors = EXCLUDED.risk_factors,
          activity_level = EXCLUDED.activity_level,
          medical_history = EXCLUDED.medical_history,
          health_status = EXCLUDED.health_status,
          baseline_signals = EXCLUDED.baseline_signals,
          status = EXCLUDED.status
        """
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(cur, table="public.patients", columns=columns, rows=rows, conflict_sql=conflict)
        return len(rows)

    def insert_abnormal_episodes(self, episodes: Sequence[AbnormalEpisodeLog]) -> int:
        if not episodes:
            return 0
        columns = (
            "episode_id", "patient_id", "device_id", "episode_type",
            "start_time", "end_time", "duration_seconds", "duration_minutes",
            "peak_heart_rate", "min_heart_rate",
            "systolic_bp_delta_min", "systolic_bp_delta_max",
            "diastolic_bp_delta_min", "diastolic_bp_delta_max",
            "spo2_delta_min", "spo2_delta_max",
            "severity", "status",
        )
        rows = rows_from_models(episodes, columns)
        patient_id = episodes[0].patient_id
        conflict = "ON CONFLICT (episode_id) DO NOTHING"
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                # Delete all existing episodes for this patient before re-inserting
                # so stale episodes from previous simulator runs are removed.
                cur.execute("DELETE FROM public.scenario_ground_truth WHERE patient_id = %s", (patient_id,))
                execute_batch_insert(cur, table="public.scenario_ground_truth", columns=columns, rows=rows, conflict_sql=conflict)
        return len(rows)

    def insert_abnormal_episode(self, episode: AbnormalEpisodeLog) -> int:
        columns = (
            "episode_id", "patient_id", "device_id", "episode_type",
            "start_time", "end_time", "duration_seconds", "duration_minutes",
            "peak_heart_rate", "min_heart_rate",
            "systolic_bp_delta_min", "systolic_bp_delta_max",
            "diastolic_bp_delta_min", "diastolic_bp_delta_max",
            "spo2_delta_min", "spo2_delta_max",
            "severity", "status",
        )
        rows = rows_from_models([episode], columns)
        conflict = """
        ON CONFLICT (episode_id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          device_id = EXCLUDED.device_id,
          episode_type = EXCLUDED.episode_type,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          duration_seconds = EXCLUDED.duration_seconds,
          duration_minutes = EXCLUDED.duration_minutes,
          peak_heart_rate = EXCLUDED.peak_heart_rate,
          min_heart_rate = EXCLUDED.min_heart_rate,
          systolic_bp_delta_min = EXCLUDED.systolic_bp_delta_min,
          systolic_bp_delta_max = EXCLUDED.systolic_bp_delta_max,
          diastolic_bp_delta_min = EXCLUDED.diastolic_bp_delta_min,
          diastolic_bp_delta_max = EXCLUDED.diastolic_bp_delta_max,
          spo2_delta_min = EXCLUDED.spo2_delta_min,
          spo2_delta_max = EXCLUDED.spo2_delta_max,
          severity = EXCLUDED.severity,
          status = EXCLUDED.status
        """
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(cur, table="public.scenario_ground_truth", columns=columns, rows=rows, conflict_sql=conflict)
        return 1

    def insert_fault_log(self, faults: Sequence[WearableFaultLog]) -> int:
        columns = ("patient_id", "device_id", "stream_name", "fault_type", "source_message_id", "detail", "occurred_at")
        rows = rows_from_models(faults, columns)
        conflict = "ON CONFLICT (patient_id, source_message_id) WHERE source_message_id IS NOT NULL DO NOTHING"
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(cur, table="public.wearable_fault_log", columns=columns, rows=rows, conflict_sql=conflict)
        return len(rows)

    def upsert_patient_lab_results(self, lab_results: Sequence[PatientLabResultCreate]) -> int:
        columns = (
            "lab_result_id",
            "patient_id",
            "sampled_at",
            "panel_type",
            "test_name",
            "value_numeric",
            "value_text",
            "unit",
            "reference_range",
            "abnormal_flag",
            "source",
        )
        rows = rows_from_models(lab_results, columns)
        conflict = """
        ON CONFLICT (patient_id, sampled_at, panel_type, test_name) DO UPDATE SET
          value_numeric = EXCLUDED.value_numeric,
          value_text = EXCLUDED.value_text,
          unit = EXCLUDED.unit,
          reference_range = EXCLUDED.reference_range,
          abnormal_flag = EXCLUDED.abnormal_flag,
          source = EXCLUDED.source
        """
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(
                    cur,
                    table="public.patient_lab_results",
                    columns=columns,
                    rows=rows,
                    conflict_sql=conflict,
                )
        return len(rows)

    def upsert_devices(self, devices: Sequence[DeviceCreate]) -> int:
        columns = ("device_id", "patient_id", "device_type", "vendor", "model", "external_device_key", "status")
        rows = rows_from_models(devices, columns)
        conflict = """
        ON CONFLICT (device_id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          device_type = EXCLUDED.device_type,
          vendor = EXCLUDED.vendor,
          model = EXCLUDED.model,
          external_device_key = EXCLUDED.external_device_key,
          status = EXCLUDED.status
        """
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(cur, table="public.devices", columns=columns, rows=rows, conflict_sql=conflict)
        return len(rows)

    def upsert_device_sensors(self, sensors: Sequence[DeviceSensorCreate]) -> int:
        columns = ("sensor_id", "device_id", "sensor_type", "label", "unit", "stream_name", "sampling_mode", "config", "active")
        rows = rows_from_models(sensors, columns)
        conflict = """
        ON CONFLICT (device_id, stream_name, sensor_type) DO UPDATE SET
          label = EXCLUDED.label,
          unit = EXCLUDED.unit,
          sampling_mode = EXCLUDED.sampling_mode,
          config = EXCLUDED.config,
          active = EXCLUDED.active
        """
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                execute_batch_insert(cur, table="public.device_sensors", columns=columns, rows=rows, conflict_sql=conflict)
        return len(rows)

    def create_alert(self, alert: AlertCreate, context: AlertContextCreate | None = None) -> None:
        data = alert.db_dict()
        columns = tuple(data.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        sql = f"""
            INSERT INTO public.alerts ({", ".join(columns)})
            VALUES ({placeholders})
            ON CONFLICT (alert_id) DO NOTHING
        """
        values = tuple(Json(value) if isinstance(value, (dict, list)) else value for value in data.values())
        with self._client.connection() as conn:
            with conn.cursor() as cur:
                started = perf_counter()
                try:
                    cur.execute(sql, values)
                except Exception:
                    inc_error("supabase", "alert_insert_error")
                    raise
                finally:
                    observe_db_insert("supabase_alerts", 1, (perf_counter() - started) * 1000)
                if context is not None:
                    started = perf_counter()
                    try:
                        self._insert_alert_context(cur, context)
                    except Exception:
                        inc_error("supabase", "alert_context_insert_error")
                        raise
                    finally:
                        observe_db_insert("supabase_alert_context", 1, (perf_counter() - started) * 1000)

    def _insert_alert_context(self, cursor: Any, context: AlertContextCreate) -> None:
        data = context.db_dict()
        columns = tuple(data.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        values = tuple(Json(value) if isinstance(value, (dict, list)) else value for value in data.values())
        cursor.execute(
            f"""
            INSERT INTO public.alert_context ({", ".join(columns)})
            VALUES ({placeholders})
            ON CONFLICT (alert_id) DO UPDATE SET
              patient_id = EXCLUDED.patient_id,
              window_start = EXCLUDED.window_start,
              window_end = EXCLUDED.window_end,
              summary = EXCLUDED.summary,
              chart_query_params = EXCLUDED.chart_query_params
            """,
            values,
        )

    def get_active_alerts(self, patient_id: str | None = None, *, limit: int = 100) -> list[dict[str, Any]]:
        sql = """
            SELECT *
            FROM public.alerts
            WHERE status IN ('new', 'viewed')
        """
        params: list[Any] = []
        if patient_id:
            sql += " AND patient_id = %s"
            params.append(patient_id)
        sql += " ORDER BY alert_time DESC LIMIT %s"
        params.append(limit)
        return self._client.fetch_all(sql, tuple(params))
