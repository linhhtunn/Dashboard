from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from rabbit_mq.config import topology_config


BACKEND_DIR = Path(__file__).resolve().parents[1]
RABBIT_MQ_DIR = Path(__file__).resolve().parent
DEFAULT_ENV_PATH = BACKEND_DIR / ".env" if (BACKEND_DIR / ".env").exists() else RABBIT_MQ_DIR / ".env"


def load_env_file(path: Path = DEFAULT_ENV_PATH) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class RabbitMQSettings:
    url: str
    events_exchange: dict[str, Any]
    dlx_exchange: dict[str, Any]
    queues: dict[str, dict[str, Any]]
    dead_letter_routing_key: str
    publisher_config: dict[str, Any]
    connection_config: dict[str, Any]
    consumer_config: dict[str, dict[str, Any]]

    @classmethod
    def from_env(cls, env_path: Path = DEFAULT_ENV_PATH) -> "RabbitMQSettings":
        load_env_file(env_path)
        url = os.getenv("RABBITMQ_URL")
        if not url:
            raise RuntimeError(f"Missing RABBITMQ_URL in environment or {env_path}")

        return cls(
            url=url,
            events_exchange=topology_config.EVENTS_EXCHANGE,
            dlx_exchange=topology_config.DLX_EXCHANGE,
            queues=topology_config.QUEUES,
            dead_letter_routing_key=topology_config.DEAD_LETTER_ROUTING_KEY,
            publisher_config=topology_config.PUBLISHER_CONFIG,
            connection_config=topology_config.CONNECTION_CONFIG,
            consumer_config=topology_config.CONSUMER_CONFIG,
        )

    def queue(self, key: str) -> dict[str, Any]:
        try:
            return self.queues[key]
        except KeyError as exc:
            known = ", ".join(sorted(self.queues))
            raise ValueError(f"Unknown RabbitMQ queue key={key!r}. Known: {known}") from exc

    @classmethod
    def from_topology_for_dry_run(cls) -> "RabbitMQSettings":
        return cls(
            url="dry-run",
            events_exchange=topology_config.EVENTS_EXCHANGE,
            dlx_exchange=topology_config.DLX_EXCHANGE,
            queues=topology_config.QUEUES,
            dead_letter_routing_key=topology_config.DEAD_LETTER_ROUTING_KEY,
            publisher_config=topology_config.PUBLISHER_CONFIG,
            connection_config=topology_config.CONNECTION_CONFIG,
            consumer_config=topology_config.CONSUMER_CONFIG,
        )

    def consumer_options(self, queue_key: str) -> dict[str, Any]:
        queue = self.queue(queue_key)
        config_key = queue["consumer_config"]
        try:
            return self.consumer_config[config_key]
        except KeyError as exc:
            known = ", ".join(sorted(self.consumer_config))
            raise ValueError(f"Unknown consumer_config={config_key!r}. Known: {known}") from exc


def connect(settings: RabbitMQSettings) -> pika.BlockingConnection:
    import pika

    try:
        parameters = pika.URLParameters(settings.url)
        parameters.heartbeat = settings.connection_config["heartbeat"]
        parameters.blocked_connection_timeout = settings.connection_config["blocked_connection_timeout"]
        parameters.socket_timeout = settings.connection_config["socket_timeout"]
        parameters.connection_attempts = settings.connection_config["connection_attempts"]
        parameters.retry_delay = settings.connection_config["retry_delay"]
        return pika.BlockingConnection(parameters)
    except pika.exceptions.IncompatibleProtocolError as exc:
        parsed = urlparse(settings.url)
        safe_url = f"{parsed.scheme}://{parsed.hostname}:{parsed.port or '(default)'}{parsed.path}"
        raise RuntimeError(
            "RabbitMQ/LavinMQ connection failed during protocol negotiation. "
            f"URL in use: {safe_url}. "
            "Check that the URL is the AMQP connection URL, not the web manager URL. "
            "If using TLS, use amqps:// with port 5671. "
            "If using plain AMQP, use amqp:// with port 5672. "
            "Do not mix amqps:// with a non-TLS port."
        ) from exc


def _ensure_queue(
    channel: Any,
    connection: Any,
    *,
    queue_name: str,
    durable: bool,
    arguments: dict[str, Any] | None,
) -> tuple[Any, bool]:
    """Declare a queue, reusing an existing one when broker args differ (e.g. no DLX)."""
    import pika

    try:
        channel.queue_declare(queue=queue_name, passive=True)
        return channel, True
    except pika.exceptions.ChannelClosedByBroker as exc:
        if exc.reply_code != 404:
            raise RuntimeError(
                f"Cannot declare queue {queue_name!r}: {exc}. "
                "If queues were created with different settings, delete them in CloudAMQP "
                "and rerun --declare-only, or publish with --no-declare."
            ) from exc
        channel = connection.channel()

    channel.queue_declare(queue=queue_name, durable=durable, arguments=arguments)
    return channel, False


def declare_team1_topology(channel: Any, settings: RabbitMQSettings) -> None:
    connection = channel.connection
    channel.exchange_declare(
        exchange=settings.events_exchange["name"],
        exchange_type=settings.events_exchange["type"],
        durable=settings.events_exchange["durable"],
    )
    channel.exchange_declare(
        exchange=settings.dlx_exchange["name"],
        exchange_type=settings.dlx_exchange["type"],
        durable=settings.dlx_exchange["durable"],
    )

    queue_arguments = {
        "x-dead-letter-exchange": settings.dlx_exchange["name"],
        "x-dead-letter-routing-key": settings.dead_letter_routing_key,
    }
    reused_queues: list[str] = []
    for queue in settings.queues.values():
        arguments = queue_arguments if queue["dlx"] else None
        channel, reused = _ensure_queue(
            channel,
            connection,
            queue_name=queue["name"],
            durable=queue["durable"],
            arguments=arguments,
        )
        if reused:
            reused_queues.append(queue["name"])
        channel.queue_bind(
            exchange=queue["exchange"],
            queue=queue["name"],
            routing_key=queue["routing_key"],
        )

    if reused_queues:
        print(
            "Reused existing queues (skipped redeclare with DLX): "
            + ", ".join(reused_queues)
        )


def persistent_json_properties(message_type: str) -> Any:
    import pika

    return pika.BasicProperties(
        content_type=topology_config.PUBLISHER_CONFIG["content_type"],
        delivery_mode=topology_config.PUBLISHER_CONFIG["delivery_mode"],
        type=message_type,
    )


def apply_qos(channel: Any, settings: RabbitMQSettings, queue_key: str) -> None:
    options = settings.consumer_options(queue_key)
    channel.basic_qos(prefetch_count=options["prefetch_count"])
