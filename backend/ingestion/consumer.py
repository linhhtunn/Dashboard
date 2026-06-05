"""RabbitMQ consumer for the raw vitals queue (CloudAMQP via RABBITMQ_URL)."""

from __future__ import annotations

import logging
import time
from typing import Callable

import pika
from pika.adapters.blocking_connection import BlockingChannel

from settings import RabbitMQSettings

logger = logging.getLogger(__name__)


class VitalConsumer:
    def __init__(
        self,
        *,
        rabbitmq_url: str,
        rabbitmq_settings: RabbitMQSettings,
        on_message: Callable[[bytes], None],
    ) -> None:
        self._rabbitmq_url = rabbitmq_url
        self._settings = rabbitmq_settings
        self._on_message = on_message

    def _connect(self) -> tuple[pika.BlockingConnection, BlockingChannel]:
        params = pika.URLParameters(self._rabbitmq_url)
        params.heartbeat = self._settings.heartbeat_seconds
        params.blocked_connection_timeout = self._settings.blocked_connection_timeout_seconds
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.basic_qos(prefetch_count=self._settings.prefetch_count)

        if self._settings.passive_consume:
            channel.queue_declare(queue=self._settings.queue_name, passive=True)
            logger.info(
                "Passive consume on queue=%s (topology must be declared upstream)",
                self._settings.queue_name,
            )
        else:
            channel.exchange_declare(
                exchange=self._settings.exchange_name,
                exchange_type=self._settings.exchange_type,
                durable=True,
            )
            channel.queue_declare(queue=self._settings.queue_name, durable=True)
            channel.queue_bind(
                exchange=self._settings.exchange_name,
                queue=self._settings.queue_name,
                routing_key=self._settings.routing_key,
            )

        return connection, channel

    def _handle_delivery(self, channel: BlockingChannel, method, _properties, body: bytes) -> None:
        try:
            self._on_message(body)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            logger.exception("Failed to process message")
            channel.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=self._settings.requeue_on_error,
            )

    def run_forever(self) -> None:
        backoff = self._settings.reconnect_initial_backoff_seconds
        while True:
            connection = None
            try:
                connection, channel = self._connect()
                logger.info(
                    "Consuming queue=%s exchange=%s routing_key=%s",
                    self._settings.queue_name,
                    self._settings.exchange_name,
                    self._settings.routing_key,
                )
                channel.basic_consume(
                    queue=self._settings.queue_name,
                    on_message_callback=self._handle_delivery,
                    auto_ack=False,
                )
                channel.start_consuming()
            except KeyboardInterrupt:
                logger.info("Consumer stopped")
                break
            except pika.exceptions.ChannelClosedByBroker as exc:
                logger.error(
                    "Queue %s not available (%s). Declare topology first: "
                    "cd backend && python -m rabbit_mq.replay_generated_data --declare-only",
                    self._settings.queue_name,
                    exc,
                )
                break
            except Exception:
                logger.exception("Connection error; retry in %ss", backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, self._settings.reconnect_max_backoff_seconds)
            finally:
                if connection and connection.is_open:
                    connection.close()
