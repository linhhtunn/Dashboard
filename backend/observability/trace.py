from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import psycopg2
from psycopg2.extras import Json

from database.config import load_database_config
from observability.context import TraceContext, utc_now
from . import metrics

logger = logging.getLogger(__name__)


def _parse_time(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    return utc_now()


def _parse_optional_time(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    try:
        return _parse_time(value)
    except Exception:
        logger.debug("Invalid observability timestamp value=%r", value, exc_info=True)
        return None


def _percentile(values: list[float], percentile: float) -> float | None:
    clean = sorted(value for value in values if value >= 0)
    if not clean:
        return None
    if len(clean) == 1:
        return clean[0]
    rank = (len(clean) - 1) * percentile
    lower = int(rank)
    upper = min(lower + 1, len(clean) - 1)
    weight = rank - lower
    return clean[lower] * (1 - weight) + clean[upper] * weight


def _status_for_latency(metric: str, p95_ms: float | None) -> tuple[str, str | None]:
    thresholds = {
        "team4_receive_latency_ms": 2000.0,
        "team4_queue_latency_ms": 1000.0,
        "team4_subscribe_latency_ms": 1000.0,
        "realtime_backend_latency_ms": 1000.0,
        "detection_latency_ms": 2000.0,
    }
    threshold = thresholds.get(metric)
    if threshold is None or p95_ms is None:
        return "info", None
    return ("passed" if p95_ms <= threshold else "warning", f"p95 <= {threshold:g}ms")


class ObservabilityWriter:
    """Best-effort writer for evaluation run metadata and trace events."""

    def __init__(self) -> None:
        self._enabled = os.getenv("OBSERVABILITY_TRACE_ENABLED", "1").strip().lower() not in {"0", "false", "no", "off"}

    def _connect(self) -> Any:
        config = load_database_config()
        return psycopg2.connect(config.require_timescale_db_url())

    def _should_write(self, run_id: str | None) -> bool:
        return self._enabled and bool(run_id)

    def create_run(self, run_id: str, *, profile: str | None = None, config: dict[str, Any] | None = None, notes: str | None = None) -> None:
        if not self._should_write(run_id):
            return
        metrics.set_run_status(run_id, "running")
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO test_runs (run_id, profile, status, config, notes)
                        VALUES (%s, %s, 'running', %s, %s)
                        ON CONFLICT (run_id) DO UPDATE SET
                          profile = EXCLUDED.profile,
                          status = 'running',
                          started_at = now(),
                          ended_at = NULL,
                          config = EXCLUDED.config,
                          notes = EXCLUDED.notes
                        """,
                        (run_id, profile, Json(config or {}), notes),
                    )
        except Exception:
            logger.debug("Failed to create observability run=%s", run_id, exc_info=True)

    def finish_run(self, run_id: str, *, status: str, summary: dict[str, Any] | None = None, notes: str | None = None) -> None:
        if not self._should_write(run_id):
            return
        metrics.set_run_status(run_id, status)
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE test_runs
                        SET status = %s, ended_at = now(), summary = %s, notes = COALESCE(%s, notes)
                        WHERE run_id = %s
                        """,
                        (status, Json(summary or {}), notes, run_id),
                    )
        except Exception:
            logger.debug("Failed to finish observability run=%s", run_id, exc_info=True)

    def record_step(
        self,
        run_id: str | None,
        *,
        step: str,
        status: str,
        message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not self._should_write(run_id):
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO test_run_steps (run_id, step, status, message, metadata)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (run_id, step, status, message, Json(metadata or {})),
                    )
        except Exception:
            logger.debug("Failed to record observability step run=%s step=%s", run_id, step, exc_info=True)

    def record_event(
        self,
        context: TraceContext,
        *,
        component: str,
        stage: str,
        event_time: Any | None = None,
        duration_ms: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        metrics.observe_stage(component, stage, duration_ms)
        if not self._should_write(context.run_id):
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO perf_trace_events (
                          run_id, trace_id, message_id, alert_id, patient_id, abnormal_event_time,
                          component, stage, event_time, duration_ms, metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            context.run_id,
                            context.trace_id,
                            context.message_id,
                            context.alert_id,
                            context.patient_id,
                            _parse_optional_time(context.abnormal_event_time),
                            component,
                            stage,
                            _parse_time(event_time),
                            duration_ms,
                            Json(metadata or {}),
                        ),
                    )
        except Exception:
            logger.debug(
                "Failed to write perf trace event run=%s component=%s stage=%s metadata=%s",
                context.run_id,
                component,
                stage,
                json.dumps(metadata or {}, default=str),
                exc_info=True,
            )

    def record_queue_sample(
        self,
        run_id: str | None,
        *,
        queue_name: str,
        message_count: int | None,
        consumer_count: int | None,
        unacked_count: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        metrics.set_queue_sample(queue_name, message_count, consumer_count, unacked_count)
        if not self._should_write(run_id):
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO perf_queue_samples (
                          run_id, queue_name, message_count, consumer_count, unacked_count, metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (run_id, queue_name, message_count, consumer_count, unacked_count, Json(metadata or {})),
                    )
        except Exception:
            logger.debug("Failed to write queue sample run=%s queue=%s", run_id, queue_name, exc_info=True)

    def record_result(
        self,
        run_id: str | None,
        *,
        metric: str,
        status: str,
        value_numeric: float | None = None,
        value_text: str | None = None,
        threshold: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not self._should_write(run_id):
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO evaluation_results (
                          run_id, metric, status, value_numeric, value_text, threshold, metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (run_id, metric, status, value_numeric, value_text, threshold, Json(metadata or {})),
                    )
        except Exception:
            logger.debug("Failed to write evaluation result run=%s metric=%s", run_id, metric, exc_info=True)

    def summarize_latencies(self, run_id: str | None) -> dict[str, dict[str, float | int]]:
        if not self._should_write(run_id):
            return {}
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        WITH per_trace AS (
                          SELECT
                            COALESCE(alert_id, trace_id, message_id) AS trace_key,
                            MIN(abnormal_event_time) FILTER (WHERE abnormal_event_time IS NOT NULL) AS abnormal_event_time,
                            MIN(event_time) FILTER (WHERE component = 'team2' AND stage = 'rabbit_received') AS rabbit_received_at,
                            MIN(event_time) FILTER (WHERE component = 'team2' AND stage = 'normalized') AS normalized_at,
                            MIN(event_time) FILTER (WHERE component = 'team3' AND stage = 'detected') AS detected_at,
                            MIN(event_time) FILTER (WHERE component = 'team3' AND stage = 'alert_published') AS alert_published_at,
                            MIN(event_time) FILTER (WHERE component = 'team3' AND stage = 'alert_inserted') AS alert_inserted_at,
                            MIN(event_time) FILTER (WHERE component = 'team4' AND stage LIKE 'team4%%received') AS team4_received_at,
                            MIN(event_time) FILTER (WHERE component = 'team4' AND stage = 'team4_rendered') AS team4_rendered_at
                          FROM perf_trace_events
                          WHERE run_id = %s
                          GROUP BY COALESCE(alert_id, trace_id, message_id)
                        )
                        SELECT
                          EXTRACT(EPOCH FROM detected_at - abnormal_event_time) * 1000 AS detection_latency_ms,
                          EXTRACT(EPOCH FROM normalized_at - rabbit_received_at) * 1000 AS normalize_latency_ms,
                          EXTRACT(EPOCH FROM detected_at - normalized_at) * 1000 AS team3_detection_latency_ms,
                          EXTRACT(EPOCH FROM alert_published_at - detected_at) * 1000 AS alert_publish_latency_ms,
                          EXTRACT(EPOCH FROM alert_inserted_at - detected_at) * 1000 AS supabase_insert_latency_ms,
                          EXTRACT(EPOCH FROM alert_published_at - rabbit_received_at) * 1000 AS realtime_backend_latency_ms,
                          EXTRACT(EPOCH FROM team4_received_at - alert_published_at) * 1000 AS team4_queue_latency_ms,
                          EXTRACT(EPOCH FROM team4_received_at - alert_inserted_at) * 1000 AS team4_subscribe_latency_ms,
                          EXTRACT(EPOCH FROM team4_received_at - abnormal_event_time) * 1000 AS team4_receive_latency_ms,
                          EXTRACT(EPOCH FROM team4_rendered_at - team4_received_at) * 1000 AS team4_render_latency_ms,
                          EXTRACT(EPOCH FROM team4_rendered_at - abnormal_event_time) * 1000 AS true_e2e_user_latency_ms
                        FROM per_trace
                        WHERE trace_key IS NOT NULL
                        """,
                        (run_id,),
                    )
                    columns = [desc[0] for desc in cur.description]
                    values_by_metric: dict[str, list[float]] = {column: [] for column in columns}
                    for row in cur.fetchall():
                        for column, value in zip(columns, row):
                            if value is not None:
                                values_by_metric[column].append(float(value))
        except Exception:
            logger.debug("Failed to summarize latencies run=%s", run_id, exc_info=True)
            return {}

        summary: dict[str, dict[str, float | int]] = {}
        for metric, values in values_by_metric.items():
            if not values:
                continue
            summary[metric] = {
                "count": len(values),
                "avg_ms": sum(values) / len(values),
                "p50_ms": _percentile(values, 0.50) or 0.0,
                "p95_ms": _percentile(values, 0.95) or 0.0,
                "p99_ms": _percentile(values, 0.99) or 0.0,
                "max_ms": max(values),
            }
        return summary

    def record_latency_results(self, run_id: str | None) -> dict[str, dict[str, float | int]]:
        summary = self.summarize_latencies(run_id)
        for metric, stats in summary.items():
            p95_ms = float(stats["p95_ms"])
            status, threshold = _status_for_latency(metric, p95_ms)
            self.record_result(
                run_id,
                metric=metric,
                status=status,
                value_numeric=p95_ms,
                threshold=threshold,
                metadata=stats,
            )
        return summary


writer = ObservabilityWriter()
