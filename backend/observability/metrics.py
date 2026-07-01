from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Gauge, Histogram, start_http_server
except Exception:  # pragma: no cover - optional dependency fallback
    Counter = Gauge = Histogram = None  # type: ignore[assignment]
    start_http_server = None  # type: ignore[assignment]


_server_started = False
_server_lock = threading.Lock()


if Counter is not None:
    MESSAGES_TOTAL = Counter(
        "health_realtime_messages_total",
        "Messages processed by the realtime pipeline.",
        ["component", "stage", "routing_key"],
    )
    ERRORS_TOTAL = Counter(
        "health_realtime_errors_total",
        "Errors observed in the realtime pipeline.",
        ["component", "kind"],
    )
    ALERTS_TOTAL = Counter(
        "health_realtime_alerts_total",
        "Alerts created or delivered by the realtime pipeline.",
        ["component", "alert_type", "stage"],
    )
    STAGE_LATENCY = Histogram(
        "health_realtime_stage_latency_ms",
        "Stage latency in milliseconds.",
        ["component", "stage"],
        buckets=(1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000),
    )
    DB_INSERT_LATENCY = Histogram(
        "health_realtime_db_insert_latency_ms",
        "Timescale insert/upsert latency by destination table.",
        ["table"],
        buckets=(1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000),
    )
    DB_ROWS_TOTAL = Counter(
        "health_realtime_db_rows_total",
        "Rows inserted or upserted by destination table.",
        ["table"],
    )
    QUEUE_DEPTH = Gauge(
        "health_realtime_queue_depth",
        "RabbitMQ ready message count sampled by the evaluation runner.",
        ["queue"],
    )
    QUEUE_UNACKED = Gauge(
        "health_realtime_queue_unacked",
        "RabbitMQ unacked message count when available.",
        ["queue"],
    )
    QUEUE_CONSUMERS = Gauge(
        "health_realtime_queue_consumers",
        "RabbitMQ consumer count sampled by the evaluation runner.",
        ["queue"],
    )
    RUN_STATUS = Gauge(
        "health_realtime_run_status",
        "Run status gauge: 1 running, 2 passed, 3 warning, 4 failed, 5 stopped.",
        ["run_id"],
    )
else:
    MESSAGES_TOTAL = ERRORS_TOTAL = ALERTS_TOTAL = STAGE_LATENCY = None
    DB_INSERT_LATENCY = DB_ROWS_TOTAL = QUEUE_DEPTH = QUEUE_UNACKED = QUEUE_CONSUMERS = RUN_STATUS = None


def start_prometheus_server(port: int | None) -> None:
    if not port or start_http_server is None:
        return
    global _server_started
    with _server_lock:
        if _server_started:
            return
        start_http_server(port)
        _server_started = True
        logger.info("Prometheus metrics server started on port %s", port)


def inc_message(component: str, stage: str, routing_key: str | None = None, amount: int = 1) -> None:
    if MESSAGES_TOTAL is not None:
        MESSAGES_TOTAL.labels(component, stage, routing_key or "unknown").inc(amount)


def inc_error(component: str, kind: str, amount: int = 1) -> None:
    if ERRORS_TOTAL is not None:
        ERRORS_TOTAL.labels(component, kind).inc(amount)


def inc_alert(component: str, alert_type: str | None, stage: str, amount: int = 1) -> None:
    if ALERTS_TOTAL is not None:
        ALERTS_TOTAL.labels(component, alert_type or "unknown", stage).inc(amount)


def observe_stage(component: str, stage: str, duration_ms: float | None) -> None:
    if STAGE_LATENCY is not None and duration_ms is not None:
        STAGE_LATENCY.labels(component, stage).observe(max(duration_ms, 0.0))


def observe_db_insert(table: str, row_count: int, duration_ms: float | None) -> None:
    if DB_INSERT_LATENCY is not None and duration_ms is not None:
        DB_INSERT_LATENCY.labels(table).observe(max(duration_ms, 0.0))
    if DB_ROWS_TOTAL is not None and row_count > 0:
        DB_ROWS_TOTAL.labels(table).inc(row_count)


def set_queue_sample(
    queue_name: str,
    message_count: int | None,
    consumer_count: int | None,
    unacked_count: int | None = None,
) -> None:
    if QUEUE_DEPTH is not None and message_count is not None:
        QUEUE_DEPTH.labels(queue_name).set(message_count)
    if QUEUE_UNACKED is not None and unacked_count is not None:
        QUEUE_UNACKED.labels(queue_name).set(unacked_count)
    if QUEUE_CONSUMERS is not None and consumer_count is not None:
        QUEUE_CONSUMERS.labels(queue_name).set(consumer_count)


def set_run_status(run_id: str, status: str) -> None:
    if RUN_STATUS is None:
        return
    value = {"running": 1, "passed": 2, "warning": 3, "failed": 4, "stopped": 5}.get(status, 0)
    RUN_STATUS.labels(run_id).set(value)


def labels_from_metadata(metadata: dict[str, Any] | None) -> dict[str, str]:
    if not metadata:
        return {}
    return {str(key): str(value) for key, value in metadata.items() if value is not None}
