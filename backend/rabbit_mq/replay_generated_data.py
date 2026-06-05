from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator

from rabbit_mq.rabbitmq import (
    RabbitMQSettings,
    connect,
    declare_team1_topology,
    persistent_json_properties,
)


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = BACKEND_DIR / "simulator" / "output"
DEFAULT_VITALS_PATH = DEFAULT_OUTPUT_DIR / "generated_vitals_P001_2h.jsonl"
DEFAULT_GROUND_TRUTH_PATH = DEFAULT_OUTPUT_DIR / "scenario_ground_truth_P001_2h.json"


def iter_jsonl(path: Path, limit: int | None = None, skip: int = 0) -> Iterator[dict]:
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


def iter_ground_truth(path: Path) -> Iterator[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        yield from payload
    else:
        yield payload


def parse_utc_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def ground_truth_matches_timestamp(ground_truth: dict, timestamp: datetime) -> bool:
    event_start = parse_utc_timestamp(ground_truth["event_start"])
    event_end = parse_utc_timestamp(ground_truth["event_end"])
    return event_start <= timestamp < event_end


def validate_vitals_message(message: dict) -> None:
    required_top_level = {"message_id", "schema_version", "patient_id", "device_id", "timestamp", "signals"}
    missing = required_top_level - set(message)
    if missing:
        raise ValueError(f"Vitals message missing fields: {sorted(missing)}")

    required_signals = {
        "heart_rate",
        "rr_interval_ms",
        "hrv_rmssd",
        "systolic_bp",
        "diastolic_bp",
        "spo2",
        "acc_x",
        "acc_y",
        "acc_z",
        "acc_magnitude",
        "gyro_x",
        "gyro_y",
        "gyro_z",
        "gyro_magnitude",
    }
    missing_signals = required_signals - set(message["signals"])
    if missing_signals:
        raise ValueError(f"Vitals message missing signals: {sorted(missing_signals)}")

    signals = message["signals"]
    if not 30 <= signals["heart_rate"] <= 220:
        raise ValueError("Vitals message has heart_rate outside 30-220.")
    if not 0 <= signals["spo2"] <= 100:
        raise ValueError("Vitals message has spo2 outside 0-100.")
    if signals["systolic_bp"] <= signals["diastolic_bp"]:
        raise ValueError("Vitals message has systolic_bp <= diastolic_bp.")


def count_invalid_vitals_messages(messages: Iterable[dict]) -> int:
    invalid_count = 0
    for message in messages:
        try:
            validate_vitals_message(message)
        except ValueError:
            invalid_count += 1
    return invalid_count


def validate_ground_truth_message(message: dict) -> None:
    required = {
        "scenario_id",
        "patient_id",
        "event_type",
        "ground_truth_label",
        "event_start",
        "event_end",
        "expected_severity",
        "expected_pattern",
    }
    missing = required - set(message)
    if missing:
        raise ValueError(f"Ground truth message missing fields: {sorted(missing)}")


def sleep_between_messages(connection, delay_seconds: float) -> None:
    if delay_seconds <= 0:
        return
    if connection is not None and getattr(connection, "is_open", False):
        connection.sleep(delay_seconds)
        return
    time.sleep(delay_seconds)


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

    def publish(self, exchange: str, routing_key: str, message: dict, message_type: str) -> None:
        if self.dry_run:
            self.dry_run_samples[routing_key] = self.dry_run_samples.get(routing_key, 0) + 1
            if self.dry_run_samples[routing_key] <= 3:
                print(f"[dry-run] {routing_key}: {json.dumps(message, ensure_ascii=False)}")
            return

        import pika

        max_retries = self.settings.publisher_config["max_publish_retries"]
        for attempt in range(max_retries + 1):
            try:
                self.channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=json.dumps(message, ensure_ascii=True, separators=(",", ":")).encode("utf-8"),
                    properties=persistent_json_properties(message_type),
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


def replay_vitals_with_matching_ground_truth(
    publisher: PublishSession,
    settings: RabbitMQSettings,
    vitals_messages: Iterable[dict],
    ground_truth_messages: Iterable[dict],
    delay_seconds: float,
) -> tuple[int, int]:
    raw_vitals_queue = settings.queue("raw_vitals")
    ground_truth_queue = settings.queue("ground_truth")
    published_ground_truth_ids: set[str] = set()
    vitals_count = 0
    ground_truth_count = 0
    ground_truth_list = list(ground_truth_messages)

    for vitals_message in vitals_messages:
        try:
            vitals_timestamp = parse_utc_timestamp(vitals_message["timestamp"])
        except (KeyError, TypeError, ValueError):
            vitals_timestamp = None

        if vitals_timestamp is not None:
            for ground_truth in ground_truth_list:
                scenario_id = ground_truth["scenario_id"]
                if scenario_id in published_ground_truth_ids:
                    continue
                if not ground_truth_matches_timestamp(ground_truth, vitals_timestamp):
                    continue

                publisher.publish(
                    exchange=ground_truth_queue["exchange"],
                    routing_key=ground_truth_queue["routing_key"],
                    message=ground_truth,
                    message_type=ground_truth_queue["message_type"],
                )
                published_ground_truth_ids.add(scenario_id)
                ground_truth_count += 1

        publisher.publish(
            exchange=raw_vitals_queue["exchange"],
            routing_key=raw_vitals_queue["routing_key"],
            message=vitals_message,
            message_type=raw_vitals_queue["message_type"],
        )
        vitals_count += 1

        publisher.sleep(delay_seconds)

    return vitals_count, ground_truth_count


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Replay generated simulator files to RabbitMQ/CloudAMQP.")
    parser.add_argument("--vitals", type=Path, default=DEFAULT_VITALS_PATH, help="Generated vitals JSONL file.")
    parser.add_argument(
        "--ground-truth",
        type=Path,
        default=DEFAULT_GROUND_TRUTH_PATH,
        help="Scenario ground truth JSON file.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Limit vitals messages for safe testing.")
    parser.add_argument("--skip", type=int, default=0, help="Skip this many vitals messages before replaying.")
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Sleep between vitals messages.")
    parser.add_argument("--skip-vitals", action="store_true", help="Do not publish vitals.raw.")
    parser.add_argument("--skip-ground-truth", action="store_true", help="Do not publish scenario.ground_truth.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print samples without RabbitMQ connection.")
    parser.add_argument("--strict-validation", action="store_true", help="Fail if any vitals message violates schema.")
    parser.add_argument("--declare-only", action="store_true", help="Declare RabbitMQ topology and exit without publishing.")
    parser.add_argument("--no-declare", action="store_true", help="Publish without declaring topology first.")
    parser.add_argument("--env", type=Path, default=None, help="Optional .env path. Defaults to backend/rabbit_mq/.env.")
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()

    vitals_messages = list(iter_jsonl(args.vitals, limit=args.limit, skip=args.skip)) if not args.skip_vitals else []
    ground_truth_messages = list(iter_ground_truth(args.ground_truth)) if not args.skip_ground_truth else []

    invalid_vitals_count = count_invalid_vitals_messages(vitals_messages)
    if args.strict_validation and invalid_vitals_count:
        raise ValueError(f"Vitals file contains {invalid_vitals_count} invalid/fault-injected messages.")
    for message in ground_truth_messages:
        validate_ground_truth_message(message)

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

    publisher = PublishSession(settings=settings, dry_run=args.dry_run, no_declare=args.no_declare)
    publisher.open()
    try:
        if args.skip_vitals:
            ground_truth_queue = settings.queue("ground_truth")
            vitals_count = 0
            ground_truth_count = 0
            for ground_truth in ground_truth_messages:
                publisher.publish(
                    exchange=ground_truth_queue["exchange"],
                    routing_key=ground_truth_queue["routing_key"],
                    message=ground_truth,
                    message_type=ground_truth_queue["message_type"],
                )
                ground_truth_count += 1
        else:
            vitals_count, ground_truth_count = replay_vitals_with_matching_ground_truth(
                publisher=publisher,
                settings=settings,
                vitals_messages=vitals_messages,
                ground_truth_messages=ground_truth_messages,
                delay_seconds=args.delay_seconds,
            )
    finally:
        publisher.close()

    mode = "Validated" if args.dry_run else "Published"
    print(f"{mode} vitals.raw messages: {vitals_count}")
    print(f"{mode} scenario.ground_truth messages: {ground_truth_count}")
    if invalid_vitals_count:
        print(f"{mode} fault-injected/invalid vitals messages: {invalid_vitals_count}")


if __name__ == "__main__":
    main()
