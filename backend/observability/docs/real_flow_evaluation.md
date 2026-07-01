# Real Flow Evaluation Guide

This guide explains how to evaluate the real Team 1 -> Team 2+3 -> Team 4 flow with repeatable runs, Prometheus, Grafana, and Timescale trace tables.

## 1. Contracts To Verify

Before interpreting performance numbers, verify these functional contracts:

- Team 1 publishes sensor messages to RabbitMQ exchange `health.events`.
- `wearable.ppi_batch` uses `ppi_intervals_ms[]`.
- Team 2 consumes `q.team2.*`, validates, normalizes, and writes Timescale/TigerData.
- Team 3 runs in the same process as Team 2 and detects from normalized RAM state.
- Alerts publish routing key `alerts.created`.
- Alert queue is `q.alerts.created`.
- Alert DB target is Supabase `public.alerts` and `public.alert_context`.
- Team 4 probe receives alerts via RabbitMQ or Supabase polling/realtime path.

## 2. Start Monitoring

Copy the env template:

```powershell
Copy-Item backend/observability/evaluation.env.example backend/observability/.env
```

Start Prometheus and Grafana:

```powershell
cd backend/observability
docker compose --env-file .env up -d
```

Open:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- App metrics endpoint: `http://localhost:9108/metrics`

Start Team 2+3 with Prometheus metrics enabled:

```powershell
cd backend
$env:OBSERVABILITY_PROMETHEUS_PORT="9108"
python -c "from ingestion.stream_consumer import StreamConsumerService; StreamConsumerService().run_forever()"
```

## 3. Run Evaluation

Smoke run:

```powershell
cd backend
python -m observability.run_realtime_evaluation --run-id smoke_1p --profile smoke --patient-id P005 --limit 120 --target-msg-sec 5 --team4-path rabbitmq --no-declare
```

Multi-patient load run:

```powershell
python -m observability.run_realtime_evaluation --run-id load_10p_10m --profile load_baseline --patient-ids P001 P002 P003 P004 P005 P006 P007 P008 P009 P010 --concurrency 10 --duration-seconds 600 --limit 100000 --target-msg-sec 50 --team4-path rabbitmq --no-declare
```

Motion/PPI-heavy run:

```powershell
python -m observability.run_realtime_evaluation --run-id load_motion_ppi_heavy --profile stress --patient-ids P001 P002 P003 P004 P005 --concurrency 5 --streams wearable_ppi_batch wearable_motion_batch wearable_spo2_triggered --duration-seconds 900 --limit 100000 --target-msg-sec 250 --team4-path rabbitmq --no-declare
```

## 4. Load Ladder

Run the ladder in order and compare p95/p99 latency plus queue backlog:

| Level | Shape | Goal |
| --- | --- | --- |
| 1 | 1 patient, 2 minutes | Validate functional flow and baseline latency. |
| 2 | 10 patients, 10 minutes | First useful throughput baseline. |
| 3 | 50 patients, 30 minutes | Detect DB and queue pressure. |
| 4 | 100 patients, 30-60 minutes | Find current MVP capacity ceiling. |
| 5 | Motion-heavy / PPI-heavy | Stress Team 3 CPU and per-patient locking. |

Stop increasing load when any of these happen:

- Queue depth grows continuously.
- p95 `team4_receive_latency_ms` exceeds 2 seconds.
- p95 `realtime_backend_latency_ms` exceeds 1 second.
- p95 `supabase_insert_latency_ms` exceeds 500 ms.
- `missed_alert_count > 0`.
- `duplicate_alert_count > 0`.

## 5. Dashboards

Dashboard A - Functional / Health:

- HR/RR/SpO2 by patient.
- Alert timeline.
- Alert table.
- Alert severity distribution.
- Ground truth vs detected alert count.
- Missed alert count.
- Duplicate alert count.
- Run steps.

Dashboard B - Performance:

- messages/sec.
- rows/sec.
- p95/p99 normalize latency.
- p95/p99 Timescale insert latency.
- p95/p99 `process_sample` latency.
- p95/p99 motion expansion latency.
- p95/p99 PPI batch latency.
- p95/p99 Supabase alert/context insert latency.
- backend realtime latency.
- queue depth and DLQ count.
- error rate.
- CPU/RAM when Prometheus process/node/cAdvisor metrics are available.

Dashboard C - Team 4 Realtime:

- p95 `true_e2e_user_latency_ms`.
- p95 `team4_subscribe_latency_ms`.
- p95 `team4_render_latency_ms`.
- received alert count.
- missed alert count.
- duplicate alert count.
- latest received alert.
- slowest 20 alerts.

## 6. Metric Interpretation

Layer 2 performance answers:

- Is the system fast enough?
- Which stage is slow?
- What is the current maximum sustainable load?

Use these stage metrics:

| Component | Metrics |
| --- | --- |
| Team 1 | `publish_latency`, `publish_success`, `publish_error`, messages/sec. |
| RabbitMQ | queue depth, ready/unacked messages, consumer count, DLQ count, publish/consume rate from RabbitMQ Prometheus plugin. |
| Team 2 | decode latency, normalize latency, validation errors, Timescale insert latency, rows/sec, batch flush latency. |
| Team 3 | process sample latency, motion expansion latency, PPI batch latency, detection latency, alert publish latency. |
| Supabase | alert insert latency, alert context insert latency, insert errors. |
| Team 4 | subscribe latency, queue latency, render latency, missed alerts, duplicate alerts. |
| End-to-end | backend realtime latency, Team 4 receive latency, true user-visible latency. |

## 7. Useful SQL

Stage p95/p99 from trace table:

```sql
SELECT
  component,
  stage,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  COUNT(*) AS samples
FROM perf_trace_events
WHERE run_id = '$run_id'
  AND duration_ms IS NOT NULL
GROUP BY component, stage
ORDER BY component, stage;
```

Slowest Team 4 alerts:

```sql
WITH per_alert AS (
  SELECT
    COALESCE(alert_id, trace_id, message_id) AS alert_key,
    MAX(alert_id) AS alert_id,
    MAX(patient_id) AS patient_id,
    MIN(abnormal_event_time) FILTER (WHERE abnormal_event_time IS NOT NULL) AS abnormal_event_time,
    MIN(event_time) FILTER (WHERE component = 'team4' AND stage LIKE 'team4%received') AS team4_received_at
  FROM perf_trace_events
  WHERE run_id = '$run_id'
  GROUP BY COALESCE(alert_id, trace_id, message_id)
)
SELECT
  alert_id,
  patient_id,
  abnormal_event_time,
  team4_received_at,
  EXTRACT(EPOCH FROM team4_received_at - abnormal_event_time) * 1000 AS team4_receive_latency_ms
FROM per_alert
WHERE team4_received_at IS NOT NULL
ORDER BY team4_receive_latency_ms DESC
LIMIT 20;
```

## 8. Current Limitations

- `true_e2e_user_latency_ms` only appears when a real UI or Playwright probe writes `team4_rendered` into `perf_trace_events`.
- AMQP passive queue sampling gives ready messages and consumer count. Use the RabbitMQ Prometheus plugin for unacked messages and publish/consume rates.
- Supabase polling probe is a placeholder for Team 4; it should be replaced by the real frontend realtime subscriber or a Playwright UI probe later.
