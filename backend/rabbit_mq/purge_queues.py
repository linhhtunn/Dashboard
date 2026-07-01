from __future__ import annotations

import argparse
from collections.abc import Iterable

import pika

from rabbit_mq.rabbitmq import RabbitMQSettings, connect


CELERY_QUEUE_NAMES = ("celery",)


def _configured_queue_names(settings: RabbitMQSettings) -> list[str]:
    queue_names: list[str] = []
    for queue in settings.queues.values():
        name = str(queue["name"])
        if name not in queue_names:
            queue_names.append(name)
    for name in CELERY_QUEUE_NAMES:
        if name not in queue_names:
            queue_names.append(name)
    return queue_names


def _resolve_queue_names(settings: RabbitMQSettings, requested: Iterable[str] | None) -> list[str]:
    configured = _configured_queue_names(settings)
    if not requested:
        return configured

    resolved: list[str] = []
    for value in requested:
        queue_name = settings.queues.get(value, {}).get("name", value)
        queue_name = str(queue_name)
        if queue_name not in resolved:
            resolved.append(queue_name)
    return resolved


def purge_queues(queue_names: list[str]) -> int:
    settings = RabbitMQSettings.from_env()
    connection = connect(settings)
    failures = 0

    try:
        for queue_name in queue_names:
            channel = connection.channel()
            try:
                before = channel.queue_declare(queue=queue_name, passive=True).method.message_count
                purged = channel.queue_purge(queue=queue_name).method.message_count
                after = channel.queue_declare(queue=queue_name, passive=True).method.message_count
                print(f"{queue_name}\tbefore={before}\tpurged={purged}\tafter={after}")
            except pika.exceptions.ChannelClosedByBroker as exc:
                failures += 1
                if exc.reply_code == 404:
                    print(f"{queue_name}\tskipped=not_found")
                else:
                    print(f"{queue_name}\terror={exc.reply_code}: {exc.reply_text}")
            finally:
                if getattr(channel, "is_open", False):
                    channel.close()
    finally:
        if connection.is_open:
            connection.close()

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge RabbitMQ queues from the configured backend topology.")
    parser.add_argument(
        "--queue",
        action="append",
        dest="queues",
        help="Queue key from topology_config.py or physical queue name. Repeat to purge multiple queues. Defaults to all configured queues.",
    )
    args = parser.parse_args()

    settings = RabbitMQSettings.from_env()
    queue_names = _resolve_queue_names(settings, args.queues)
    return 1 if purge_queues(queue_names) else 0


if __name__ == "__main__":
    raise SystemExit(main())
