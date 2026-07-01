from __future__ import annotations

import json
import logging
import queue
import threading
from pathlib import Path
from typing import Any

from observability.context import trace_context_from_payload, utc_now_iso
from observability.trace import writer as observability_writer
from rabbit_mq.rabbitmq import RabbitMQSettings, connect, declare_team1_topology, persistent_json_properties
from simulator.pipeline.publisher.replay_generated_data import STREAM_CONFIGS

logger = logging.getLogger(__name__)

# Maximum messages to drain from the internal queue per worker iteration.
# Batching reduces the impact of per-message network RTT when publisher
# confirms are disabled (fire-and-forget mode).
_BATCH_DRAIN_SIZE = 32


class RealtimeRabbitPublisher:
    """Async publisher optimized for realtime simulator use.

    Key difference from the pipeline PublishSession:
    - Opens connection **without publisher confirms** (fire-and-forget) to avoid
      blocking on broker ACK round-trips over high-latency links (CloudAMQP).
    - Drains the internal queue in batches so multiple messages are published
      per lock acquisition, reducing per-message overhead.
    - Falls back to confirmed mode only when explicitly requested via
      ``use_publisher_confirms=True``.
    """

    def __init__(
        self,
        *,
        enabled: bool,
        env_path: Path | None = None,
        no_declare: bool = False,
        async_mode: bool = True,
        max_queue_size: int = 2000,
        use_publisher_confirms: bool = False,
    ) -> None:
        self.enabled = enabled
        self.env_path = env_path
        self.no_declare = no_declare
        self.async_mode = async_mode
        self.use_publisher_confirms = use_publisher_confirms
        self._connection: Any = None
        self._channel: Any = None
        self._settings: RabbitMQSettings | None = None
        self._publish_queue: queue.Queue[tuple[str, dict[str, Any]]] = queue.Queue(maxsize=max_queue_size)
        self._stop_event = threading.Event()
        self._worker: threading.Thread | None = None
        self._lock = threading.Lock()
        self._dropped_messages = 0
        self._published_count = 0
        self._last_error: str | None = None

    def close(self, *, drain: bool = True) -> None:
        self._stop_event.set()
        if not drain:
            self.enabled = False
            self._discard_pending()
        worker = self._worker
        if worker is not None and worker.is_alive():
            worker.join(timeout=1.0)
        if not self._lock.acquire(timeout=0.5):
            return
        try:
            self._close_connection_locked()
            if self._worker is None or not self._worker.is_alive():
                self._worker = None
                self._stop_event = threading.Event()
        finally:
            self._lock.release()

    def _close_connection_locked(self) -> None:
        if self._connection is not None:
            try:
                self._connection.close()
            except Exception:
                pass
        self._connection = None
        self._channel = None
        self._settings = None

    def _discard_pending(self) -> int:
        discarded = 0
        while True:
            try:
                self._publish_queue.get_nowait()
            except queue.Empty:
                break
            self._publish_queue.task_done()
            discarded += 1
        if discarded:
            self._last_error = f"discarded {discarded} pending publish message(s)"
        return discarded

    def stats(self) -> dict[str, Any]:
        return {
            "pending": self._publish_queue.qsize(),
            "dropped_messages": self._dropped_messages,
            "published_count": self._published_count,
            "last_error": self._last_error,
        }

    def _ensure_worker(self) -> None:
        if not self.async_mode:
            return
        if self._worker is not None and self._worker.is_alive():
            return
        self._worker = None
        self._stop_event.clear()
        self._worker = threading.Thread(target=self._worker_loop, name="simulator-rabbit-publisher", daemon=True)
        self._worker.start()

    def _worker_loop(self) -> None:
        while not self._stop_event.is_set() or not self._publish_queue.empty():
            # Drain up to _BATCH_DRAIN_SIZE messages per iteration to reduce
            # lock contention and amortize network cost.
            batch: list[tuple[str, dict[str, Any]]] = []
            try:
                item = self._publish_queue.get(timeout=0.1)
                batch.append(item)
            except queue.Empty:
                continue
            # Drain remaining items without blocking
            while len(batch) < _BATCH_DRAIN_SIZE:
                try:
                    batch.append(self._publish_queue.get_nowait())
                except queue.Empty:
                    break
            try:
                self._publish_batch(batch)
            except Exception as exc:
                self._last_error = f"{type(exc).__name__}: {exc}"
                logger.warning("Realtime publisher batch failed: %s", exc)
            finally:
                for _ in batch:
                    self._publish_queue.task_done()

    def _open_locked(self) -> None:
        if self._connection is not None and self._channel is not None:
            try:
                if self._connection.is_open:
                    return
            except Exception:
                pass
        # Open a fresh connection WITHOUT publisher confirms for low-latency
        self._settings = RabbitMQSettings.from_env(self.env_path) if self.env_path else RabbitMQSettings.from_env()
        self._connection = connect(self._settings)
        self._channel = self._connection.channel()
        if self.use_publisher_confirms:
            self._channel.confirm_delivery()
        if not self.no_declare:
            declare_team1_topology(self._channel, self._settings)

    def _reset_connection_locked(self) -> None:
        try:
            if self._connection is not None:
                self._connection.close()
        except Exception:
            pass
        self._connection = None
        self._channel = None
        self._settings = None

    def _publish_batch(self, batch: list[tuple[str, dict[str, Any]]]) -> None:
        if not self.enabled or not batch:
            return
        with self._lock:
            self._open_locked()
            assert self._settings is not None
            assert self._channel is not None
            for stream_name, message in batch:
                queue_info = self._settings.queue(STREAM_CONFIGS[stream_name].queue_key)
                try:
                    body = json.dumps(message, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
                    self._channel.basic_publish(
                        exchange=queue_info["exchange"],
                        routing_key=queue_info["routing_key"],
                        body=body,
                        properties=persistent_json_properties(),
                        mandatory=False,
                    )
                except Exception:
                    self._reset_connection_locked()
                    raise
                self._published_count += 1
                published_at = utc_now_iso()
                context = message.get("context")
                if isinstance(context, dict):
                    context["published_at"] = published_at
                observability_writer.record_event(
                    trace_context_from_payload(message),
                    component="team1",
                    stage="team1_published",
                    event_time=published_at,
                    metadata={"stream_name": stream_name, "routing_key": queue_info.get("routing_key")},
                )

    def _publish_sync(self, stream_name: str, message: dict[str, Any]) -> dict[str, Any] | None:
        """Synchronous single-message publish (used when async_mode=False)."""
        if not self.enabled:
            return None
        self._publish_batch([(stream_name, message)])
        if self._settings is not None:
            return self._settings.queue(STREAM_CONFIGS[stream_name].queue_key)
        return None

    def queue_info(self, stream_name: str) -> dict[str, Any]:
        settings = self._settings or RabbitMQSettings.from_topology_for_dry_run()
        return settings.queue(STREAM_CONFIGS[stream_name].queue_key)

    def publish(self, stream_name: str, message: dict[str, Any]) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        if not self.async_mode:
            return self._publish_sync(stream_name, message)
        self._ensure_worker()
        try:
            self._publish_queue.put_nowait((stream_name, message))
        except queue.Full:
            self._dropped_messages += 1
            self._last_error = "publish queue full"
        return self.queue_info(stream_name)
