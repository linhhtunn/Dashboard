from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from rabbit_mq.rabbitmq import (
    RabbitMQSettings,
    connect,
    declare_team1_topology,
    persistent_json_properties,
)

try:
    from observability.context import TraceContext, ensure_payload_context, utc_now_iso
    from observability.metrics import inc_error, inc_message, observe_stage
    from observability.trace import writer as observability_writer
except Exception:  # pragma: no cover - observability is optional for publisher reuse
    TraceContext = None  # type: ignore[assignment]
    ensure_payload_context = None  # type: ignore[assignment]
    utc_now_iso = None  # type: ignore[assignment]
    observability_writer = None  # type: ignore[assignment]

    def inc_message(*_args, **_kwargs) -> None:  # type: ignore[no-redef]
        return

    def inc_error(*_args, **_kwargs) -> None:  # type: ignore[no-redef]
        return

    def observe_stage(*_args, **_kwargs) -> None:  # type: ignore[no-redef]
        return


SIMULATOR_DIR = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = SIMULATOR_DIR / "output"
DEFAULT_SUFFIX = "P005_24h"


@dataclass(frozen=True)
class StreamConfig:
    queue_key: str
    clean_filename: str
    patient_filename: str
    file_format: str
    timestamp_field: str


STREAM_CONFIGS: dict[str, StreamConfig] = {
    "wearable_continuous": StreamConfig(
        queue_key="wearable_continuous",
        clean_filename="wearable_continuous_{suffix}.jsonl",
        patient_filename="continuous.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_steps_event": StreamConfig(
        queue_key="wearable_steps_event",
        clean_filename="wearable_steps_event_{suffix}.jsonl",
        patient_filename="steps_event.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_stress": StreamConfig(
        queue_key="wearable_stress",
        clean_filename="wearable_stress_{suffix}.jsonl",
        patient_filename="stress.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_ppi_batch": StreamConfig(
        queue_key="wearable_ppi_batch",
        clean_filename="wearable_ppi_batch_{suffix}.jsonl",
        patient_filename="ppi_batch.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_motion_batch": StreamConfig(
        queue_key="wearable_motion_batch",
        clean_filename="wearable_motion_batch_{suffix}.jsonl",
        patient_filename="motion_batch.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_spo2_triggered": StreamConfig(
        queue_key="wearable_spo2_triggered",
        clean_filename="wearable_spo2_triggered_{suffix}.jsonl",
        patient_filename="spo2_triggered.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_bp_triggered": StreamConfig(
        queue_key="wearable_bp_triggered",
        clean_filename="wearable_bp_triggered_{suffix}.jsonl",
        patient_filename="bp_triggered.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_ecg_triggered": StreamConfig(
        queue_key="wearable_ecg_triggered",
        clean_filename="wearable_ecg_triggered_{suffix}.jsonl",
        patient_filename="ecg_triggered.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_battery": StreamConfig(
        queue_key="wearable_battery",
        clean_filename="wearable_battery_{suffix}.jsonl",
        patient_filename="battery.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "sleep_timeline": StreamConfig(
        queue_key="sleep_timeline",
        clean_filename="sleep_timeline_{suffix}.json",
        patient_filename="sleep_timeline.json",
        file_format="json",
        timestamp_field="start_time",
    ),
    "daily_metrics": StreamConfig(
        queue_key="daily_metrics",
        clean_filename="daily_metrics_{suffix}.json",
        patient_filename="daily_metrics.json",
        file_format="json",
        timestamp_field="measured_at",
    ),
}


@dataclass(frozen=True)
class PublishItem:
    stream_name: str
    order: int
    timestamp: datetime
    record: dict[str, Any]


def parse_utc_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _sort_timestamp(record: dict[str, Any], timestamp_field: str) -> datetime:
    value = record.get(timestamp_field)
    if not value and timestamp_field == "start_time":
        value = record.get("sleep_start")
    if not value:
        return datetime.max.replace(tzinfo=timezone.utc)
    try:
        return parse_utc_timestamp(str(value))
    except ValueError:
        return datetime.max.replace(tzinfo=timezone.utc)


def _iter_jsonl(path: Path, limit: int | None = None, skip: int = 0) -> Iterator[dict[str, Any]]:
    emitted = 0
    with path.open("r", encoding="utf-8-sig") as file:
        for index, line in enumerate(file, start=1):
            if index <= skip:
                continue
            if limit is not None and emitted >= limit:
                break
            line = line.strip()
            if not line:
                continue
            emitted += 1
            yield json.loads(line)


def _iter_json_records(path: Path) -> Iterator[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(payload, list):
        for item in payload:
            yield item
    else:
        yield payload


def _stream_path(stream_name: str, config: StreamConfig, args: argparse.Namespace) -> Path:
    override = getattr(args, stream_name)
    if override is not None:
        return override

    if args.patient_id:
        patient_path = args.output_dir / args.patient_id / config.patient_filename
        if patient_path.exists():
            return patient_path

    clean_path = args.output_dir / config.clean_filename.format(suffix=args.suffix)
    if clean_path.exists():
        return clean_path

    if args.patient_id:
        return args.output_dir / args.patient_id / config.patient_filename
    return clean_path


def _load_stream_items(
    *,
    stream_name: str,
    config: StreamConfig,
    path: Path,
    limit: int | None,
    skip: int,
    order_start: int,
) -> list[PublishItem]:
    if not path.exists():
        raise FileNotFoundError(f"Missing {stream_name} input file: {path}")

    if config.file_format == "jsonl":
        records = _iter_jsonl(path, limit=limit, skip=skip)
    else:
        records = _iter_json_records(path)

    items = []
    for offset, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"{stream_name} must contain JSON objects, got {type(record).__name__}.")
        items.append(
            PublishItem(
                stream_name=stream_name,
                order=order_start + offset,
                timestamp=_sort_timestamp(record, config.timestamp_field),
                record=record,
            )
        )
    return items


def sleep_between_messages(connection, delay_seconds: float) -> None:
    if delay_seconds <= 0:
        return
    if connection is not None and getattr(connection, "is_open", False):
        connection.sleep(delay_seconds)
        return
    time.sleep(delay_seconds)


def _effective_delay(args: argparse.Namespace) -> float:
    if args.target_msg_sec and args.target_msg_sec > 0:
        return 1.0 / float(args.target_msg_sec)
    if args.speed_multiplier and args.speed_multiplier > 0:
        return max(args.delay_seconds, 0.0) / float(args.speed_multiplier)
    return max(args.delay_seconds, 0.0)


def _attach_observability_context(message: dict[str, Any], *, args: argparse.Namespace, stream_name: str) -> str | None:
    if not args.run_id or ensure_payload_context is None or utc_now_iso is None:
        return None
    context = ensure_payload_context(message)
    trace_id = context.get("trace_id") or message.get("message_id")
    published_at = utc_now_iso()
    context["run_id"] = args.run_id
    context["trace_id"] = trace_id
    context["published_at"] = published_at
    context["replay_stream"] = stream_name
    context["replay_target_msg_sec"] = args.target_msg_sec
    context.setdefault(
        "abnormal_event_time",
        message.get("timestamp") or message.get("window_start") or message.get("measured_at"),
    )
    return published_at


def _record_publish_event(
    *,
    args: argparse.Namespace,
    item: PublishItem,
    queue: dict[str, Any],
    published_at: str | None,
) -> None:
    inc_message("team1", "published", queue.get("routing_key"))
    if not args.run_id or observability_writer is None or TraceContext is None:
        return
    message_id = item.record.get("message_id")
    context = item.record.get("context") if isinstance(item.record.get("context"), dict) else {}
    observability_writer.record_event(
        TraceContext(
            run_id=args.run_id,
            trace_id=str(context.get("trace_id") or message_id) if (context.get("trace_id") or message_id) else None,
            message_id=str(message_id) if message_id else None,
            patient_id=str(item.record.get("patient_id")) if item.record.get("patient_id") else None,
            abnormal_event_time=context.get("abnormal_event_time"),
        ),
        component="team1",
        stage="team1_published",
        event_time=published_at,
        metadata={"stream_name": item.stream_name, "routing_key": queue.get("routing_key")},
    )


def preview_payload(message: dict[str, Any]) -> str:
    preview = dict(message)
    ecg_points = preview.get("ecg_points")
    if isinstance(ecg_points, list):
        preview["ecg_points"] = f"<{len(ecg_points)} points>"
    return json.dumps(preview, ensure_ascii=False)


class PublishSession:
    def __init__(self, settings: RabbitMQSettings, dry_run: bool, no_declare: bool) -> None:
        self.settings = settings
        self.dry_run = dry_run
        self.no_declare = no_declare
        self.connection = None
        self.channel = None
        self.dry_run_samples: dict[str, int] = {}

    def open(self) -> None:
        if self.dry_run:
            return
        self.connection = connect(self.settings)
        self.channel = self.connection.channel()
        if self.settings.publisher_config["publisher_confirms"]:
            self.channel.confirm_delivery()
        if not self.no_declare:
            declare_team1_topology(self.channel, self.settings)

    def close(self) -> None:
        if self.connection is not None and self.connection.is_open:
            self.connection.close()

    def reconnect(self, reason: Exception) -> None:
        print(f"Publish connection lost ({type(reason).__name__}). Reconnecting and retrying current message...")
        self.close()
        time.sleep(self.settings.connection_config["retry_delay"])
        self.open()

    def publish(self, queue: dict[str, Any], message: dict[str, Any]) -> None:
        routing_key = queue["routing_key"]
        if self.dry_run:
            self.dry_run_samples[routing_key] = self.dry_run_samples.get(routing_key, 0) + 1
            if self.dry_run_samples[routing_key] <= 3:
                print(f"[dry-run] {routing_key}: {preview_payload(message)}")
            return

        import pika

        max_retries = self.settings.publisher_config["max_publish_retries"]
        for attempt in range(max_retries + 1):
            try:
                self.channel.basic_publish(
                    exchange=queue["exchange"],
                    routing_key=routing_key,
                    body=json.dumps(message, ensure_ascii=True, separators=(",", ":")).encode("utf-8"),
                    properties=persistent_json_properties(),
                    mandatory=self.settings.publisher_config["mandatory"],
                )
                return
            except (
                pika.exceptions.AMQPConnectionError,
                pika.exceptions.AMQPChannelError,
                pika.exceptions.StreamLostError,
                OSError,
            ) as exc:
                if attempt >= max_retries:
                    raise
                self.reconnect(exc)

    def sleep(self, delay_seconds: float) -> None:
        if self.dry_run or delay_seconds <= 0:
            sleep_between_messages(self.connection, delay_seconds)
            return

        import pika

        max_retries = self.settings.publisher_config["max_publish_retries"]
        for attempt in range(max_retries + 1):
            try:
                sleep_between_messages(self.connection, delay_seconds)
                return
            except (
                pika.exceptions.AMQPConnectionError,
                pika.exceptions.AMQPChannelError,
                pika.exceptions.StreamLostError,
                OSError,
            ) as exc:
                if attempt >= max_retries:
                    raise
                self.reconnect(exc)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Replay wearable simulator output files to RabbitMQ/CloudAMQP.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Simulator output directory.")
    parser.add_argument("--suffix", default=DEFAULT_SUFFIX, help="Output file suffix, for example P005_24h.")
    parser.add_argument("--patient-id", default=None, help="Patient directory name for simulator v2 output, for example P005.")
    parser.add_argument(
        "--streams",
        nargs="+",
        choices=sorted(STREAM_CONFIGS),
        default=list(STREAM_CONFIGS),
        help="Streams to publish. sleep_metrics is intentionally not published; Team 2 derives it from sleep_timeline.",
    )
    parser.add_argument("--wearable-continuous", type=Path, default=None, help="Override wearable continuous JSONL path.")
    parser.add_argument("--wearable-steps-event", type=Path, default=None, help="Override steps event JSONL path.")
    parser.add_argument("--wearable-stress", type=Path, default=None, help="Override stress JSONL path.")
    parser.add_argument("--wearable-ppi-batch", type=Path, default=None, help="Override PPI batch JSONL path.")
    parser.add_argument("--wearable-motion-batch", type=Path, default=None, help="Override motion batch JSONL path.")
    parser.add_argument("--wearable-bp-triggered", type=Path, default=None, help="Override BP triggered JSONL path.")
    parser.add_argument("--wearable-spo2-triggered", type=Path, default=None, help="Override SpO2 triggered JSONL path.")
    parser.add_argument("--wearable-ecg-triggered", type=Path, default=None, help="Override ECG triggered JSONL path.")
    parser.add_argument("--wearable-battery", type=Path, default=None, help="Override battery JSONL path.")
    parser.add_argument("--sleep-timeline", type=Path, default=None, help="Override sleep timeline JSON path.")
    parser.add_argument("--daily-metrics", type=Path, default=None, help="Override daily metrics JSON path.")
    parser.add_argument("--limit", type=int, default=None, help="Limit continuous records for safe testing.")
    parser.add_argument("--skip", type=int, default=0, help="Skip this many continuous records before replaying.")
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Sleep after each published message.")
    parser.add_argument("--target-msg-sec", type=float, default=None, help="Publish at this target rate across selected items.")
    parser.add_argument("--speed-multiplier", type=float, default=1.0, help="Divide --delay-seconds by this multiplier when target rate is not set.")
    parser.add_argument("--duration-seconds", type=float, default=None, help="Stop publishing after this wall-clock duration.")
    parser.add_argument("--run-id", default=None, help="Optional observability run_id attached under payload.context.")
    parser.add_argument("--dry-run", action="store_true", help="Print publish samples without RabbitMQ connection.")
    parser.add_argument("--declare-only", action="store_true", help="Declare RabbitMQ topology and exit without publishing.")
    parser.add_argument("--no-declare", action="store_true", help="Publish without declaring topology first.")
    parser.add_argument("--env", type=Path, default=None, help="Optional .env path. Defaults to backend/.env.")
    return parser


def load_publish_items(args: argparse.Namespace) -> list[PublishItem]:
    items: list[PublishItem] = []
    order = 0
    for stream_name in args.streams:
        config = STREAM_CONFIGS[stream_name]
        path = _stream_path(stream_name, config, args)
        limit = args.limit if config.file_format == "jsonl" else None
        skip = args.skip if config.file_format == "jsonl" else 0
        stream_items = _load_stream_items(
            stream_name=stream_name,
            config=config,
            path=path,
            limit=limit,
            skip=skip,
            order_start=order,
        )
        order += len(stream_items)
        items.extend(stream_items)
    return sorted(items, key=lambda item: (item.timestamp, item.order))


def main() -> None:
    args = build_arg_parser().parse_args()

    if args.dry_run:
        settings = RabbitMQSettings.from_topology_for_dry_run()
    else:
        settings = RabbitMQSettings.from_env(args.env) if args.env else RabbitMQSettings.from_env()

    publisher = PublishSession(settings=settings, dry_run=args.dry_run, no_declare=args.no_declare)
    publisher.open()
    if args.declare_only:
        publisher.close()
        print("Declared RabbitMQ topology.")
        return

    items = load_publish_items(args)
    counts = {stream_name: 0 for stream_name in args.streams}
    started_at = time.perf_counter()
    delay_seconds = _effective_delay(args)
    try:
        for item in items:
            if args.duration_seconds is not None and time.perf_counter() - started_at >= args.duration_seconds:
                break
            queue = settings.queue(STREAM_CONFIGS[item.stream_name].queue_key)
            published_at = _attach_observability_context(item.record, args=args, stream_name=item.stream_name)
            publish_started = time.perf_counter()
            try:
                publisher.publish(queue=queue, message=item.record)
            except Exception:
                inc_error("team1", "publish_error")
                observe_stage("team1", "publish_latency", (time.perf_counter() - publish_started) * 1000)
                raise
            publish_ms = (time.perf_counter() - publish_started) * 1000
            observe_stage("team1", "publish_latency", publish_ms)
            inc_message("team1", "publish_success", queue.get("routing_key"))
            _record_publish_event(args=args, item=item, queue=queue, published_at=published_at)
            counts[item.stream_name] += 1
            publisher.sleep(delay_seconds)
    finally:
        publisher.close()

    mode = "Dry-run" if args.dry_run else "Published"
    for stream_name in args.streams:
        queue = settings.queue(STREAM_CONFIGS[stream_name].queue_key)
        print(f"{mode} {stream_name}: {counts[stream_name]} messages -> {queue['routing_key']}")


if __name__ == "__main__":
    main()
