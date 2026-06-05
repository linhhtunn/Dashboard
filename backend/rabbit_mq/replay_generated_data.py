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


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = BACKEND_DIR / "simulator" / "output"
DEFAULT_SUFFIX = "P005_24h"


@dataclass(frozen=True)
class StreamConfig:
    queue_key: str
    clean_filename: str
    faulty_filename: str | None
    file_format: str
    timestamp_field: str


STREAM_CONFIGS: dict[str, StreamConfig] = {
    "wearable_continuous": StreamConfig(
        queue_key="wearable_continuous",
        clean_filename="wearable_continuous_{suffix}.jsonl",
        faulty_filename="faulty_wearable_continuous_{suffix}.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_spo2_triggered": StreamConfig(
        queue_key="wearable_spo2_triggered",
        clean_filename="wearable_spo2_triggered_{suffix}.jsonl",
        faulty_filename="faulty_wearable_spo2_triggered_{suffix}.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "wearable_ecg_triggered": StreamConfig(
        queue_key="wearable_ecg_triggered",
        clean_filename="wearable_ecg_triggered_{suffix}.jsonl",
        faulty_filename="faulty_wearable_ecg_triggered_{suffix}.jsonl",
        file_format="jsonl",
        timestamp_field="timestamp",
    ),
    "sleep_timeline": StreamConfig(
        queue_key="sleep_timeline",
        clean_filename="sleep_timeline_{suffix}.json",
        faulty_filename=None,
        file_format="json",
        timestamp_field="sleep_start",
    ),
    "daily_metrics": StreamConfig(
        queue_key="daily_metrics",
        clean_filename="daily_metrics_{suffix}.json",
        faulty_filename=None,
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
    if not value:
        return datetime.max.replace(tzinfo=timezone.utc)
    try:
        return parse_utc_timestamp(str(value))
    except ValueError:
        return datetime.max.replace(tzinfo=timezone.utc)


def _iter_jsonl(path: Path, limit: int | None = None, skip: int = 0) -> Iterator[dict[str, Any]]:
    emitted = 0
    with path.open("r", encoding="utf-8") as file:
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
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        for item in payload:
            yield item
    else:
        yield payload


def _stream_path(stream_name: str, config: StreamConfig, args: argparse.Namespace) -> Path:
    override = getattr(args, stream_name)
    if override is not None:
        return override

    filename_template = config.clean_filename
    if args.faulty and config.faulty_filename is not None:
        filename_template = config.faulty_filename
    return args.output_dir / filename_template.format(suffix=args.suffix)


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
    parser.add_argument(
        "--streams",
        nargs="+",
        choices=sorted(STREAM_CONFIGS),
        default=list(STREAM_CONFIGS),
        help="Streams to publish. sleep_metrics is intentionally not published; Team 2 derives it from sleep_timeline.",
    )
    parser.add_argument("--wearable-continuous", type=Path, default=None, help="Override wearable continuous JSONL path.")
    parser.add_argument("--wearable-spo2-triggered", type=Path, default=None, help="Override SpO2 triggered JSONL path.")
    parser.add_argument("--wearable-ecg-triggered", type=Path, default=None, help="Override ECG triggered JSONL path.")
    parser.add_argument("--sleep-timeline", type=Path, default=None, help="Override sleep timeline JSON path.")
    parser.add_argument("--daily-metrics", type=Path, default=None, help="Override daily metrics JSON path.")
    parser.add_argument("--faulty", action="store_true", help="Publish faulty wearable JSONL files for data-quality tests.")
    parser.add_argument("--limit", type=int, default=None, help="Limit continuous records for safe testing.")
    parser.add_argument("--skip", type=int, default=0, help="Skip this many continuous records before replaying.")
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Sleep after each published message.")
    parser.add_argument("--dry-run", action="store_true", help="Print publish samples without RabbitMQ connection.")
    parser.add_argument("--declare-only", action="store_true", help="Declare RabbitMQ topology and exit without publishing.")
    parser.add_argument("--no-declare", action="store_true", help="Publish without declaring topology first.")
    parser.add_argument("--env", type=Path, default=None, help="Optional .env path. Defaults to backend/rabbit_mq/.env.")
    return parser


def load_publish_items(args: argparse.Namespace) -> list[PublishItem]:
    items: list[PublishItem] = []
    order = 0
    for stream_name in args.streams:
        config = STREAM_CONFIGS[stream_name]
        path = _stream_path(stream_name, config, args)
        limit = args.limit if stream_name == "wearable_continuous" else None
        skip = args.skip if stream_name == "wearable_continuous" else 0
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
        if args.declare_only:
            connection = connect(settings)
            channel = connection.channel()
            declare_team1_topology(channel, settings)
            connection.close()
            print("Declared RabbitMQ topology")
            print(f"Exchange: {settings.events_exchange['name']}")
            print(f"DLX: {settings.dlx_exchange['name']}")
            for queue in settings.queues.values():
                print(f"Queue: {queue['name']} <- {queue['routing_key']}")
            return

    items = load_publish_items(args)
    publisher = PublishSession(settings=settings, dry_run=args.dry_run, no_declare=args.no_declare)
    counts = {stream_name: 0 for stream_name in args.streams}
    publisher.open()
    try:
        for item in items:
            queue = settings.queue(STREAM_CONFIGS[item.stream_name].queue_key)
            publisher.publish(queue=queue, message=item.record)
            counts[item.stream_name] += 1
            publisher.sleep(args.delay_seconds)
    finally:
        publisher.close()

    mode = "Dry-run" if args.dry_run else "Published"
    for stream_name in args.streams:
        queue = settings.queue(STREAM_CONFIGS[stream_name].queue_key)
        print(f"{mode} {stream_name}: {counts[stream_name]} messages -> {queue['routing_key']}")


if __name__ == "__main__":
    main()

