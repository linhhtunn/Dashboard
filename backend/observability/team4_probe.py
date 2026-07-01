from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

from observability.context import TraceContext, utc_now_iso
from observability.metrics import inc_alert
from observability.trace import writer
from rabbit_mq.rabbitmq import RabbitMQSettings, connect


class Team4AlertReceiver(Protocol):
    def start(self) -> None: ...
    def stop(self) -> None: ...
    def summary(self) -> dict[str, Any]: ...


@dataclass
class ReceivedAlert:
    alert_id: str
    patient_id: str | None
    alert_type: str | None
    received_at: str
    payload: dict[str, Any]


@dataclass
class MockTeam4Receiver:
    run_id: str
    expected_alert_ids: set[str] = field(default_factory=set)
    received: list[ReceivedAlert] = field(default_factory=list)

    def start(self) -> None:
        writer.record_step(self.run_id, step="team4_mock_ready", status="passed")

    def stop(self) -> None:
        writer.record_step(self.run_id, step="team4_mock_stopped", status="passed")

    def receive(self, payload: dict[str, Any]) -> None:
        received_at = utc_now_iso()
        alert_id = str(payload.get("alert_id", ""))
        self.received.append(
            ReceivedAlert(
                alert_id=alert_id,
                patient_id=str(payload.get("patient_id")) if payload.get("patient_id") is not None else None,
                alert_type=str(payload.get("alert_type")) if payload.get("alert_type") is not None else None,
                received_at=received_at,
                payload=payload,
            )
        )
        self._record_trace(payload, received_at, "team4_mock_received")

    def _record_trace(self, payload: dict[str, Any], received_at: str, stage: str) -> None:
        features = payload.get("features") or payload.get("feature_snapshot") or {}
        if not isinstance(features, dict):
            features = {}
        observability = features.get("observability")
        if not isinstance(observability, dict):
            observability = {}
        context = TraceContext(
            run_id=payload.get("run_id") or observability.get("run_id") or (payload.get("context") or {}).get("run_id") or self.run_id,
            trace_id=payload.get("trace_id") or observability.get("trace_id"),
            message_id=(payload.get("source_event_ids") or [payload.get("source_event_id") or None])[0],
            alert_id=payload.get("alert_id"),
            patient_id=payload.get("patient_id"),
            abnormal_event_time=payload.get("abnormal_event_time") or observability.get("abnormal_event_time") or payload.get("source_event_time"),
        )
        writer.record_event(
            context,
            component="team4",
            stage=stage,
            event_time=received_at,
            metadata={"alert_type": payload.get("alert_type")},
        )
        inc_alert("team4", payload.get("alert_type"), "received")

    def summary(self) -> dict[str, Any]:
        alert_ids = [item.alert_id for item in self.received if item.alert_id]
        duplicates = len(alert_ids) - len(set(alert_ids))
        missed = sorted(self.expected_alert_ids - set(alert_ids))
        return {
            "received_count": len(self.received),
            "duplicate_count": duplicates,
            "missed_count": len(missed),
            "missed_alert_ids": missed,
        }


@dataclass
class RabbitMQTeam4Probe(MockTeam4Receiver):
    settings: RabbitMQSettings | None = None
    use_temp_queue: bool = True
    timeout_seconds: float = 30.0
    _connection: Any | None = None
    _channel: Any | None = None
    _queue_name: str | None = None
    _thread: threading.Thread | None = None
    _stop_event: threading.Event = field(default_factory=threading.Event)

    def start(self) -> None:
        self.settings = self.settings or RabbitMQSettings.from_env()
        self._connection = connect(self.settings)
        self._channel = self._connection.channel()
        alert_queue = self.settings.queue("alerts")
        if self.use_temp_queue:
            result = self._channel.queue_declare(queue="", exclusive=True, auto_delete=True)
            self._queue_name = result.method.queue
            self._channel.queue_bind(
                exchange=alert_queue["exchange"],
                queue=self._queue_name,
                routing_key=alert_queue["routing_key"],
            )
        else:
            self._queue_name = alert_queue["name"]
        self._channel.basic_consume(queue=self._queue_name, on_message_callback=self._on_message, auto_ack=False)
        self._thread = threading.Thread(target=self._consume, name=f"team4-rabbitmq-probe-{self.run_id}", daemon=True)
        self._thread.start()
        writer.record_step(
            self.run_id,
            step="team4_rabbitmq_probe_ready",
            status="passed",
            metadata={"queue": self._queue_name, "temp_queue": self.use_temp_queue},
        )

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        if self._connection is not None and getattr(self._connection, "is_open", False):
            self._connection.close()
        writer.record_step(self.run_id, step="team4_rabbitmq_probe_stopped", status="passed")

    def _consume(self) -> None:
        deadline = time.time() + self.timeout_seconds
        while not self._stop_event.is_set() and time.time() < deadline:
            try:
                self._connection.process_data_events(time_limit=1)
            except Exception as exc:
                writer.record_step(self.run_id, step="team4_rabbitmq_probe", status="warning", message=str(exc))
                break

    def _on_message(self, channel: Any, method: Any, _properties: Any, body: bytes) -> None:
        try:
            payload = json.loads(body.decode("utf-8"))
            if isinstance(payload, dict):
                self.receive(payload)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


@dataclass
class SupabaseAlertsPollingProbe(MockTeam4Receiver):
    """A dependency-light Team 4 placeholder until a true realtime client is wired."""

    poll_interval_seconds: float = 0.5
    timeout_seconds: float = 30.0
    _thread: threading.Thread | None = None
    _stop_event: threading.Event = field(default_factory=threading.Event)
    _seen: set[str] = field(default_factory=set)

    def start(self) -> None:
        self._thread = threading.Thread(target=self._poll, name=f"team4-supabase-poll-{self.run_id}", daemon=True)
        self._thread.start()
        writer.record_step(self.run_id, step="team4_supabase_poll_probe_ready", status="passed")

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        writer.record_step(self.run_id, step="team4_supabase_poll_probe_stopped", status="passed")

    def _poll(self) -> None:
        from database.config import load_database_config

        import psycopg2
        from psycopg2.extras import RealDictCursor

        deadline = time.time() + self.timeout_seconds
        try:
            config = load_database_config()
            with psycopg2.connect(config.require_supabase_db_url()) as conn:
                while not self._stop_event.is_set() and time.time() < deadline:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            """
                            SELECT *
                            FROM public.alerts
                            WHERE features->'observability'->>'run_id' = %s
                            ORDER BY created_at ASC
                            """,
                            (self.run_id,),
                        )
                        for row in cur.fetchall():
                            payload = dict(row)
                            alert_id = str(payload.get("alert_id"))
                            if alert_id in self._seen:
                                continue
                            self._seen.add(alert_id)
                            self.receive(payload)
                    time.sleep(self.poll_interval_seconds)
        except Exception as exc:
            writer.record_step(self.run_id, step="team4_supabase_poll_probe", status="warning", message=str(exc))
