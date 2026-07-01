from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any

from observability.trace import writer
from rabbit_mq.rabbitmq import RabbitMQSettings, connect


@dataclass
class QueueSample:
    queue_name: str
    message_count: int | None
    consumer_count: int | None
    unacked_count: int | None = None


@dataclass
class QueueSampler:
    run_id: str
    settings: RabbitMQSettings
    queue_keys: list[str]
    interval_seconds: float = 1.0
    samples: list[QueueSample] = field(default_factory=list)
    _stop_event: threading.Event = field(default_factory=threading.Event)
    _thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, name=f"queue-sampler-{self.run_id}", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        connection = None
        channel = None
        while not self._stop_event.is_set():
            try:
                if connection is None or not getattr(connection, "is_open", False):
                    connection = connect(self.settings)
                    channel = connection.channel()
                self._sample_with_channel(channel)
            except Exception as exc:
                writer.record_step(
                    self.run_id,
                    step="queue_sampler",
                    status="warning",
                    message=str(exc),
                )
                if connection is not None and getattr(connection, "is_open", False):
                    try:
                        connection.close()
                    except Exception:
                        pass
                connection = None
                channel = None
            self._stop_event.wait(self.interval_seconds)
        if connection is not None and getattr(connection, "is_open", False):
            connection.close()

    def sample_once(self) -> list[QueueSample]:
        connection = None
        try:
            connection = connect(self.settings)
            channel = connection.channel()
            return self._sample_with_channel(channel)
        except Exception as exc:
            writer.record_step(
                self.run_id,
                step="queue_sampler",
                status="warning",
                message=str(exc),
            )
        finally:
            if connection is not None and getattr(connection, "is_open", False):
                connection.close()
        return []

    def _sample_with_channel(self, channel: Any) -> list[QueueSample]:
        collected: list[QueueSample] = []
        seen: set[str] = set()
        for key in self.queue_keys:
            queue = self.settings.queue(key)
            queue_name = queue["name"]
            if queue_name in seen:
                continue
            seen.add(queue_name)
            method = channel.queue_declare(queue=queue_name, passive=True)
            sample = QueueSample(
                queue_name=queue_name,
                message_count=method.method.message_count,
                consumer_count=method.method.consumer_count,
            )
            collected.append(sample)
            writer.record_queue_sample(
                self.run_id,
                queue_name=queue_name,
                message_count=sample.message_count,
                consumer_count=sample.consumer_count,
                unacked_count=sample.unacked_count,
            )
        self.samples.extend(collected)
        return collected


def default_queue_keys() -> list[str]:
    return [
        "wearable_continuous",
        "wearable_ppi_batch",
        "wearable_motion_batch",
        "wearable_spo2_triggered",
        "wearable_bp_triggered",
        "alerts",
        "data_fault",
        "dead_letter",
    ]
