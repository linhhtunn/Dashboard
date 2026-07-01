from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from rabbit_mq.rabbitmq import RabbitMQSettings
from simulator.pipeline.publisher.replay_generated_data import (
    STREAM_CONFIGS,
    PublishItem,
    PublishSession,
    _load_stream_items,
)
from simulator.core.generate_patient_simulation import generate_patient_simulation
from simulator.core.generation_config import DEFAULT_CONFIG_PATH, load_generation_config, with_overrides


SIMULATOR_DIR = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = SIMULATOR_DIR / "output"
DEFAULT_STREAMS = (
    "wearable_continuous wearable_steps_event wearable_stress wearable_ppi_batch "
    "wearable_motion_batch wearable_bp_triggered wearable_spo2_triggered "
    "wearable_ecg_triggered wearable_battery sleep_timeline daily_metrics"
)


@dataclass(frozen=True)
class JobConfig:
    patient_ids: list[str]
    config_path: Path
    output_dir: Path
    start_time: str | None
    duration_hours: int | None
    streams: list[str]
    replay_mode: str
    replay_delay_seconds: float
    dry_run: bool
    no_declare: bool
    limit: int | None
    skip: int
    strict_stream_files: bool
    env_path: Path | None
    seed: int | None


@dataclass(frozen=True)
class JobPublishItem:
    patient_id: str
    suffix: str
    item: PublishItem


def _env_text(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip()


def _env_bool(name: str, default: bool = False) -> bool:
    value = _env_text(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


def _env_int(name: str, default: int | None = None) -> int | None:
    value = _env_text(name)
    if value is None:
        return default
    return int(value)


def _env_float(name: str, default: float = 0.0) -> float:
    value = _env_text(name)
    if value is None:
        return default
    return float(value)


def _split_env_list(value: str | None) -> list[str]:
    if not value:
        return []
    normalized = value.replace(",", " ")
    return [item.strip() for item in normalized.split() if item.strip()]


def _env_path(name: str, default: Path | None = None) -> Path | None:
    value = _env_text(name)
    if value is None:
        return default
    return Path(value)


def load_job_config() -> JobConfig:
    config_path = _env_path("GENERATION_CONFIG", DEFAULT_CONFIG_PATH) or DEFAULT_CONFIG_PATH
    output_dir = _env_path("OUTPUT_DIR", DEFAULT_OUTPUT_DIR) or DEFAULT_OUTPUT_DIR
    base_config = load_generation_config(config_path)
    patient_ids = _split_env_list(_env_text("PATIENT_IDS"))
    if not patient_ids:
        patient_ids = [base_config.patient_id]

    replay_mode = _env_text("REPLAY_MODE", "interleaved").lower()
    if replay_mode not in {"interleaved", "per_patient"}:
        raise ValueError("REPLAY_MODE must be 'interleaved' or 'per_patient'.")

    return JobConfig(
        patient_ids=patient_ids,
        config_path=base_config.config_path,
        output_dir=output_dir,
        start_time=_env_text("START_TIME"),
        duration_hours=_env_int("DURATION_HOURS"),
        streams=_split_env_list(_env_text("STREAMS", DEFAULT_STREAMS)),
        replay_mode=replay_mode,
        replay_delay_seconds=_env_float("REPLAY_DELAY_SECONDS", 0.0),
        dry_run=_env_bool("DRY_RUN", True),
        no_declare=_env_bool("NO_DECLARE", False),
        limit=_env_int("PUBLISH_LIMIT"),
        skip=_env_int("PUBLISH_SKIP", 0) or 0,
        strict_stream_files=_env_bool("STRICT_STREAM_FILES", False),
        env_path=_env_path("RABBITMQ_ENV_PATH"),
        seed=_env_int("SEED"),
    )


def _supported_streams(streams: list[str]) -> list[str]:
    supported = []
    for stream_name in streams:
        if stream_name in STREAM_CONFIGS:
            supported.append(stream_name)
            continue
        print(
            f"Skipping stream {stream_name!r}: no RabbitMQ replay config yet. "
            "Keep it in STREAMS for future v2 signal files, but current simulator does not publish it."
        )
    return supported


def _stream_path(output_dir: Path, patient_id: str, suffix: str, stream_name: str) -> Path:
    stream_config = STREAM_CONFIGS[stream_name]
    patient_path = output_dir / patient_id / stream_config.patient_filename
    if patient_path.exists():
        return patient_path

    return output_dir / stream_config.clean_filename.format(suffix=suffix)


def _load_items_for_suffix(
    *,
    patient_id: str,
    suffix: str,
    output_dir: Path,
    streams: list[str],
    limit: int | None,
    skip: int,
    strict_stream_files: bool,
    order_start: int,
) -> list[JobPublishItem]:
    items: list[JobPublishItem] = []
    order = order_start
    for stream_name in streams:
        stream_config = STREAM_CONFIGS[stream_name]
        path = _stream_path(output_dir, patient_id, suffix, stream_name)
        if not path.exists():
            message = f"Missing generated file for {stream_name} ({patient_id}, suffix {suffix}): {path}"
            if strict_stream_files:
                raise FileNotFoundError(message)
            print(f"Skipping {stream_name}: {message}")
            continue

        stream_limit = limit if stream_config.file_format == "jsonl" else None
        stream_skip = skip if stream_config.file_format == "jsonl" else 0
        stream_items = _load_stream_items(
            stream_name=stream_name,
            config=stream_config,
            path=path,
            limit=stream_limit,
            skip=stream_skip,
            order_start=order,
        )
        order += len(stream_items)
        items.extend(JobPublishItem(patient_id=patient_id, suffix=suffix, item=item) for item in stream_items)
    return items


def _settings(job_config: JobConfig) -> RabbitMQSettings:
    if job_config.dry_run:
        return RabbitMQSettings.from_topology_for_dry_run()
    if job_config.env_path:
        return RabbitMQSettings.from_env(job_config.env_path)
    return RabbitMQSettings.from_env()


def _publish_items(
    *,
    items: list[JobPublishItem],
    streams: list[str],
    settings: RabbitMQSettings,
    job_config: JobConfig,
) -> dict[tuple[str, str], int]:
    publisher = PublishSession(settings=settings, dry_run=job_config.dry_run, no_declare=job_config.no_declare)
    counts: dict[tuple[str, str], int] = {}
    publisher.open()
    try:
        for wrapped in items:
            stream_name = wrapped.item.stream_name
            queue = settings.queue(STREAM_CONFIGS[stream_name].queue_key)
            publisher.publish(queue=queue, message=wrapped.item.record)
            key = (wrapped.patient_id, stream_name)
            counts[key] = counts.get(key, 0) + 1
            publisher.sleep(job_config.replay_delay_seconds)
    finally:
        publisher.close()

    mode = "Dry-run" if job_config.dry_run else "Published"
    for patient_id in sorted({item.patient_id for item in items}):
        for stream_name in streams:
            queue = settings.queue(STREAM_CONFIGS[stream_name].queue_key)
            count = counts.get((patient_id, stream_name), 0)
            print(f"{mode} {patient_id} {stream_name}: {count} messages -> {queue['routing_key']}")
    return counts


def _generate_all(job_config: JobConfig) -> dict[str, str]:
    base_config = load_generation_config(job_config.config_path)
    suffixes: dict[str, str] = {}
    base_seed = job_config.seed if job_config.seed is not None else base_config.seed
    for index, patient_id in enumerate(job_config.patient_ids):
        patient_config = with_overrides(
            base_config,
            patient_id=patient_id,
            start_time=job_config.start_time,
            duration_hours=job_config.duration_hours,
            seed=base_seed + index,
            output_dir=job_config.output_dir,
        )
        print(
            "Generating "
            f"patient_id={patient_config.patient_id} suffix={patient_config.file_suffix} "
            f"start_time={patient_config.start_time} duration_hours={patient_config.duration_hours}"
        )
        generate_patient_simulation(patient_config)
        suffixes[patient_id] = patient_config.file_suffix
    return suffixes


def _sort_interleaved(items: list[JobPublishItem]) -> list[JobPublishItem]:
    return sorted(items, key=lambda wrapped: (wrapped.item.timestamp, wrapped.item.order, wrapped.patient_id))


def main() -> None:
    job_config = load_job_config()
    streams = _supported_streams(job_config.streams)
    if not streams:
        print("No publishable streams selected. Generation will still run.")

    suffixes = _generate_all(job_config)
    settings = _settings(job_config)

    if job_config.replay_mode == "per_patient":
        order = 0
        for patient_id in job_config.patient_ids:
            patient_items = _load_items_for_suffix(
                patient_id=patient_id,
                suffix=suffixes[patient_id],
                output_dir=job_config.output_dir,
                streams=streams,
                limit=job_config.limit,
                skip=job_config.skip,
                strict_stream_files=job_config.strict_stream_files,
                order_start=order,
            )
            order += len(patient_items)
            _publish_items(
                items=sorted(patient_items, key=lambda wrapped: (wrapped.item.timestamp, wrapped.item.order)),
                streams=streams,
                settings=settings,
                job_config=job_config,
            )
        return

    all_items: list[JobPublishItem] = []
    order = 0
    for patient_id in job_config.patient_ids:
        patient_items = _load_items_for_suffix(
            patient_id=patient_id,
            suffix=suffixes[patient_id],
            output_dir=job_config.output_dir,
            streams=streams,
            limit=job_config.limit,
            skip=job_config.skip,
            strict_stream_files=job_config.strict_stream_files,
            order_start=order,
        )
        order += len(patient_items)
        all_items.extend(patient_items)

    _publish_items(
        items=_sort_interleaved(all_items),
        streams=streams,
        settings=settings,
        job_config=job_config,
    )


if __name__ == "__main__":
    main()
