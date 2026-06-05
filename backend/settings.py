"""
Runtime configuration for ingestion (env / backend/.env via dotenv).
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

_BACKEND_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class NumericRange:
    minimum: float
    maximum: float

    def contains(self, value: float) -> bool:
        return self.minimum <= value <= self.maximum


def _float_env(env: Mapping[str, str], name: str, default: float) -> float:
    raw = env.get(name)
    if raw is None or raw == "":
        return default
    return float(raw)


def _int_env(env: Mapping[str, str], name: str, default: int) -> int:
    raw = env.get(name)
    if raw is None or raw == "":
        return default
    return int(raw)


def _str_env(env: Mapping[str, str], name: str, default: str) -> str:
    raw = env.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip()


def _csv_env(env: Mapping[str, str], name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw = env.get(name)
    if raw is None or raw.strip() == "":
        return default
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _safe_sql_identifier(name: str) -> str:
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return name


DEFAULT_SIGNAL_RANGES: dict[str, NumericRange] = {
    # Wearable v2 continuous / triggered fields (see backend/simulator/docs/*expected_output.md)
    "heart_rate": NumericRange(30.0, 220.0),
    "respiratory_rate": NumericRange(5.0, 60.0),
    "spo2": NumericRange(70.0, 100.0),
    "temperature_c": NumericRange(30.0, 45.0),
    "hrv_rmssd": NumericRange(0.0, 500.0),
    "stress_score": NumericRange(0.0, 99.0),
}

DEFAULT_REQUIRED_TABLES: tuple[str, ...] = ("patients", "raw_vitals", "clean_vitals")
DEFAULT_COUNT_TABLES: tuple[str, ...] = ("raw_vitals", "clean_vitals", "patients")
DEFAULT_CLEAN_VITAL_INSERT_COLUMNS: tuple[str, ...] = (
    # Must match actual Supabase `clean_vitals` columns (inspect with scripts/inspect_database.py)
    "scenario_id",
    "steps",
    "distance_km",
    "heart_rate",
    "respiratory_rate",
    "spo2",
    "temperature_c",
    "hrv_rmssd",
    "stress_score",
    "ecg_status",
    "ecg_heart_rhythm",
    "sleep_stage",
    "sleep_quality",
)
DEFAULT_INSPECT_EXPECTED_TABLES: tuple[str, ...] = (
    "patients",
    "raw_vitals",
    "clean_vitals",
    "scenario_ground_truth",
)
DEFAULT_INSPECT_REQUIRED_CLEAN_COLUMNS: tuple[str, ...] = (
    "patient_id",
    "timestamp",
    "heart_rate",
    "spo2",
)


@dataclass(frozen=True)
class ValidationSettings:
    signal_ranges: dict[str, NumericRange] = field(default_factory=lambda: dict(DEFAULT_SIGNAL_RANGES))
    heart_rate_spo2_fault_threshold: float = 80.0
    zero_signal_abs_tol: float = 1e-6
    gyro_motion_acc_threshold: float = 2.0
    min_systolic_diastolic_gap: float = 15.0


@dataclass(frozen=True)
class RabbitMQSettings:
    exchange_name: str = "health.events"
    exchange_type: str = "topic"
    routing_key: str = "wearable.continuous"
    queue_name: str = "q.team2.wearable_continuous"
    dlq_name: str = "q.dead_letter"
    dlx_exchange_name: str = "health.dlx"
    dead_letter_routing_key: str = "dead"
    prefetch_count: int = 100
    heartbeat_seconds: int = 30
    blocked_connection_timeout_seconds: int = 300
    reconnect_initial_backoff_seconds: int = 1
    reconnect_max_backoff_seconds: int = 60
    message_content_type: str = "application/json"
    message_delivery_mode: int = 2
    passive_consume: bool = True
    requeue_on_error: bool = False


@dataclass(frozen=True)
class DatabaseSettings:
    schema_name: str = "public"
    required_tables: tuple[str, ...] = DEFAULT_REQUIRED_TABLES
    count_tables: tuple[str, ...] = DEFAULT_COUNT_TABLES
    patients_table: str = "patients"
    raw_vitals_table: str = "raw_vitals"
    clean_vitals_table: str = "clean_vitals"
    patient_id_column: str = "patient_id"
    message_id_column: str = "message_id"
    timestamp_column: str = "timestamp"
    raw_payload_column: str = "raw_payload"
    raw_payload_metadata_key: str = "_ingestion"
    clean_vital_insert_columns: tuple[str, ...] = DEFAULT_CLEAN_VITAL_INSERT_COLUMNS
    connect_timeout_seconds: int = 20
    consumer_batch_commit_size: int = 25


@dataclass(frozen=True)
class InspectorSettings:
    schema_name: str = "public"
    expected_tables: tuple[str, ...] = DEFAULT_INSPECT_EXPECTED_TABLES
    required_clean_columns: tuple[str, ...] = DEFAULT_INSPECT_REQUIRED_CLEAN_COLUMNS
    clean_vitals_table: str = "clean_vitals"
    raw_vitals_table: str = "raw_vitals"
    data_state_column: str = "data_state"
    data_state_storage_note: str = (
        "clean_vitals has no data_state — store it in raw_payload._ingestion"
    )


@dataclass(frozen=True)
class MockProducerSettings:
    default_patient_id: str = "P001"
    default_message_count: int = 5
    default_interval_seconds: float = 1.0
    schema_version: str = "v1"
    device_id: str = "SIM_WATCH_001"
    message_id_prefix: str = "msg_mock"
    activity_state: str = "sitting"
    context_source: str = "mock_producer"
    base_heart_rate: int = 72
    heart_rate_sequence_mod: int = 5
    default_hrv: float = 45.0
    default_systolic_bp: float = 118.0
    default_diastolic_bp: float = 76.0
    default_spo2: float = 98.0
    default_acc_x: float = 0.1
    default_acc_y: float = 0.05
    default_acc_z: float = 0.98
    default_gyro_x: float = 0.02
    default_gyro_y: float = 0.01
    default_gyro_z: float = 0.01


@dataclass(frozen=True)
class PipelineSettings:
    default_fixture_path: str = "tests/fixtures/sample_messages.json"
    log_level: str = "INFO"
    log_format: str = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    log_every_n_messages: int = 50


@dataclass(frozen=True)
class IngestionSettings:
    validation: ValidationSettings = field(default_factory=ValidationSettings)
    rabbitmq: RabbitMQSettings = field(default_factory=RabbitMQSettings)
    database: DatabaseSettings = field(default_factory=DatabaseSettings)
    inspector: InspectorSettings = field(default_factory=InspectorSettings)
    mock_producer: MockProducerSettings = field(default_factory=MockProducerSettings)
    pipeline: PipelineSettings = field(default_factory=PipelineSettings)


def load_validation_settings(env: Mapping[str, str] | None = None) -> ValidationSettings:
    env = env or os.environ
    ranges: dict[str, NumericRange] = {}

    for field_name, default_range in DEFAULT_SIGNAL_RANGES.items():
        ranges[field_name] = NumericRange(
            minimum=_float_env(env, f"INGESTION_{field_name.upper()}_MIN", default_range.minimum),
            maximum=_float_env(env, f"INGESTION_{field_name.upper()}_MAX", default_range.maximum),
        )

    return ValidationSettings(
        signal_ranges=ranges,
        heart_rate_spo2_fault_threshold=_float_env(env, "INGESTION_HEART_RATE_SPO2_FAULT_THRESHOLD", 80.0),
        zero_signal_abs_tol=_float_env(env, "INGESTION_ZERO_SIGNAL_ABS_TOL", 1e-6),
        gyro_motion_acc_threshold=_float_env(env, "INGESTION_GYRO_MOTION_ACC_THRESHOLD", 2.0),
        min_systolic_diastolic_gap=_float_env(env, "INGESTION_MIN_SYSTOLIC_DIASTOLIC_GAP", 15.0),
    )


def load_rabbitmq_settings(env: Mapping[str, str] | None = None) -> RabbitMQSettings:
    env = env or os.environ
    return RabbitMQSettings(
        exchange_name=_str_env(env, "RABBITMQ_EXCHANGE", _str_env(env, "INGESTION_EXCHANGE_NAME", "health.events")),
        exchange_type=_str_env(env, "INGESTION_EXCHANGE_TYPE", "topic"),
        routing_key=_str_env(env, "RABBITMQ_ROUTING_KEY", _str_env(env, "INGESTION_ROUTING_KEY", "wearable.continuous")),
        queue_name=_str_env(env, "RABBITMQ_RAW_QUEUE", _str_env(env, "INGESTION_QUEUE_NAME", "q.team2.wearable_continuous")),
        dlq_name=_str_env(env, "RABBITMQ_DEAD_LETTER_QUEUE", _str_env(env, "INGESTION_DLQ_NAME", "q.dead_letter")),
        dlx_exchange_name=_str_env(env, "RABBITMQ_DLX_EXCHANGE", "health.dlx"),
        dead_letter_routing_key=_str_env(env, "RABBITMQ_DEAD_LETTER_ROUTING_KEY", "dead"),
        prefetch_count=_int_env(env, "INGESTION_PREFETCH_COUNT", 100),
        heartbeat_seconds=_int_env(env, "INGESTION_HEARTBEAT_SECONDS", 30),
        blocked_connection_timeout_seconds=_int_env(env, "INGESTION_BLOCKED_CONNECTION_TIMEOUT_SECONDS", 300),
        reconnect_initial_backoff_seconds=_int_env(env, "INGESTION_RECONNECT_INITIAL_BACKOFF_SECONDS", 1),
        reconnect_max_backoff_seconds=_int_env(env, "INGESTION_RECONNECT_MAX_BACKOFF_SECONDS", 60),
        message_content_type=_str_env(env, "INGESTION_MESSAGE_CONTENT_TYPE", "application/json"),
        message_delivery_mode=_int_env(env, "INGESTION_MESSAGE_DELIVERY_MODE", 2),
        passive_consume=_str_env(env, "INGESTION_RABBITMQ_PASSIVE_CONSUME", "true").lower()
        in ("1", "true", "yes"),
        requeue_on_error=_str_env(env, "INGESTION_REQUEUE_ON_ERROR", "false").lower()
        in ("1", "true", "yes"),
    )


def load_database_settings(env: Mapping[str, str] | None = None) -> DatabaseSettings:
    env = env or os.environ
    patients_table = _safe_sql_identifier(_str_env(env, "INGESTION_PATIENTS_TABLE", "patients"))
    raw_vitals_table = _safe_sql_identifier(_str_env(env, "INGESTION_RAW_VITALS_TABLE", "raw_vitals"))
    clean_vitals_table = _safe_sql_identifier(_str_env(env, "INGESTION_CLEAN_VITALS_TABLE", "clean_vitals"))

    required_default = (patients_table, raw_vitals_table, clean_vitals_table)
    required_tables = _csv_env(env, "INGESTION_REQUIRED_TABLES", required_default)
    count_tables = _csv_env(env, "INGESTION_COUNT_TABLES", DEFAULT_COUNT_TABLES)
    clean_columns = tuple(
        _safe_sql_identifier(name)
        for name in _csv_env(env, "INGESTION_CLEAN_VITAL_COLUMNS", DEFAULT_CLEAN_VITAL_INSERT_COLUMNS)
    )

    return DatabaseSettings(
        schema_name=_str_env(env, "INGESTION_DB_SCHEMA", "public"),
        required_tables=required_tables,
        count_tables=count_tables,
        patients_table=patients_table,
        raw_vitals_table=raw_vitals_table,
        clean_vitals_table=clean_vitals_table,
        patient_id_column=_safe_sql_identifier(_str_env(env, "INGESTION_PATIENT_ID_COLUMN", "patient_id")),
        message_id_column=_safe_sql_identifier(_str_env(env, "INGESTION_MESSAGE_ID_COLUMN", "message_id")),
        timestamp_column=_safe_sql_identifier(_str_env(env, "INGESTION_TIMESTAMP_COLUMN", "timestamp")),
        raw_payload_column=_safe_sql_identifier(_str_env(env, "INGESTION_RAW_PAYLOAD_COLUMN", "raw_payload")),
        raw_payload_metadata_key=_str_env(env, "INGESTION_RAW_PAYLOAD_METADATA_KEY", "_ingestion"),
        clean_vital_insert_columns=clean_columns,
        connect_timeout_seconds=_int_env(env, "INGESTION_DB_CONNECT_TIMEOUT_SECONDS", 20),
        consumer_batch_commit_size=_int_env(env, "INGESTION_DB_BATCH_COMMIT_SIZE", 25),
    )


def load_inspector_settings(env: Mapping[str, str] | None = None) -> InspectorSettings:
    env = env or os.environ
    db = load_database_settings(env)
    return InspectorSettings(
        schema_name=db.schema_name,
        expected_tables=_csv_env(env, "INGESTION_INSPECT_EXPECTED_TABLES", DEFAULT_INSPECT_EXPECTED_TABLES),
        required_clean_columns=_csv_env(
            env,
            "INGESTION_INSPECT_REQUIRED_CLEAN_COLUMNS",
            DEFAULT_INSPECT_REQUIRED_CLEAN_COLUMNS,
        ),
        clean_vitals_table=db.clean_vitals_table,
        raw_vitals_table=db.raw_vitals_table,
        data_state_column=_str_env(env, "INGESTION_DATA_STATE_COLUMN", "data_state"),
        data_state_storage_note=_str_env(
            env,
            "INGESTION_DATA_STATE_STORAGE_NOTE",
            "clean_vitals has no data_state — store it in raw_payload._ingestion",
        ),
    )


def load_mock_producer_settings(env: Mapping[str, str] | None = None) -> MockProducerSettings:
    env = env or os.environ
    return MockProducerSettings(
        default_patient_id=_str_env(env, "INGESTION_MOCK_PATIENT_ID", "P001"),
        default_message_count=_int_env(env, "INGESTION_MOCK_MESSAGE_COUNT", 5),
        default_interval_seconds=_float_env(env, "INGESTION_MOCK_INTERVAL_SECONDS", 1.0),
        schema_version=_str_env(env, "INGESTION_MOCK_SCHEMA_VERSION", "v1"),
        device_id=_str_env(env, "INGESTION_MOCK_DEVICE_ID", "SIM_WATCH_001"),
        message_id_prefix=_str_env(env, "INGESTION_MOCK_MESSAGE_ID_PREFIX", "msg_mock"),
        activity_state=_str_env(env, "INGESTION_MOCK_ACTIVITY_STATE", "sitting"),
        context_source=_str_env(env, "INGESTION_MOCK_CONTEXT_SOURCE", "mock_producer"),
        base_heart_rate=_int_env(env, "INGESTION_MOCK_BASE_HEART_RATE", 72),
        heart_rate_sequence_mod=_int_env(env, "INGESTION_MOCK_HEART_RATE_SEQUENCE_MOD", 5),
        default_hrv=_float_env(env, "INGESTION_MOCK_HRV", 45.0),
        default_systolic_bp=_float_env(env, "INGESTION_MOCK_SYSTOLIC_BP", 118.0),
        default_diastolic_bp=_float_env(env, "INGESTION_MOCK_DIASTOLIC_BP", 76.0),
        default_spo2=_float_env(env, "INGESTION_MOCK_SPO2", 98.0),
        default_acc_x=_float_env(env, "INGESTION_MOCK_ACC_X", 0.1),
        default_acc_y=_float_env(env, "INGESTION_MOCK_ACC_Y", 0.05),
        default_acc_z=_float_env(env, "INGESTION_MOCK_ACC_Z", 0.98),
        default_gyro_x=_float_env(env, "INGESTION_MOCK_GYRO_X", 0.02),
        default_gyro_y=_float_env(env, "INGESTION_MOCK_GYRO_Y", 0.01),
        default_gyro_z=_float_env(env, "INGESTION_MOCK_GYRO_Z", 0.01),
    )


def load_pipeline_settings(env: Mapping[str, str] | None = None) -> PipelineSettings:
    env = env or os.environ
    return PipelineSettings(
        default_fixture_path=_str_env(
            env,
            "INGESTION_DEFAULT_FIXTURE_PATH",
            "tests/fixtures/sample_messages.json",
        ),
        log_level=_str_env(env, "INGESTION_LOG_LEVEL", "INFO"),
        log_format=_str_env(
            env,
            "INGESTION_LOG_FORMAT",
            "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        ),
        log_every_n_messages=_int_env(env, "INGESTION_LOG_EVERY_N_MESSAGES", 50),
    )


def load_ingestion_settings(env: Mapping[str, str] | None = None) -> IngestionSettings:
    env = env or os.environ
    return IngestionSettings(
        validation=load_validation_settings(env),
        rabbitmq=load_rabbitmq_settings(env),
        database=load_database_settings(env),
        inspector=load_inspector_settings(env),
        mock_producer=load_mock_producer_settings(env),
        pipeline=load_pipeline_settings(env),
    )


def load_database_url(env: Mapping[str, str] | None = None) -> str:
    env = env or os.environ
    url = env.get("DATABASE_URL", "").strip()
    if not url:
        raise ValueError("DATABASE_URL is required in backend/.env")
    return url


def load_rabbitmq_url(env: Mapping[str, str] | None = None) -> str:
    env = env or os.environ
    url = env.get("RABBITMQ_URL", "").strip()
    if not url:
        raise ValueError("RABBITMQ_URL is required in backend/.env")
    return url


def resolve_backend_path(relative: str) -> Path:
    return (_BACKEND_DIR / relative).resolve()
