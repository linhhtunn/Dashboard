# Realtime Success Metrics

This document explains what the realtime evaluation numbers mean for the Team 1 -> Team 2+3 -> Team 4 flow.

## What This Evaluation Means

This is not only a pass/fail test suite. It is an observability and evaluation lab for answering:

- Is data flowing from Team 1 to Team 4 end to end?
- Which stage is currently slow?
- Does Team 4 receive every alert?
- Does latency grow when patient count or message rate grows?
- Which scale step is justified by evidence?

## Core Timestamps

| Timestamp | Meaning |
| --- | --- |
| `abnormal_event_time` | The simulator or ground-truth time when the patient first became abnormal. |
| `published_at` | Team 1 publisher sent the sensor message to RabbitMQ. |
| `rabbit_received_at` | Team 2 received the message from RabbitMQ. |
| `normalized_at` | Team 2 finished validation/normalization. |
| `timescale_inserted_at` | Team 2 finished writing a batch to TimescaleDB/TigerData. |
| `detected_at` | Team 3 detected the anomaly in RAM. |
| `alert_published_at` | Team 3 published `alerts.created` to RabbitMQ. |
| `alert_inserted_at` | Team 3 finished inserting `public.alerts` / `public.alert_context`. |
| `team4_received_at` | Team 4 probe/frontend received the alert notification. |
| `team4_rendered_at` | A real UI rendered the alert in the DOM. |

## Latency Metrics

| Metric | Formula | Meaning |
| --- | --- | --- |
| `queue_latency_ms` | `rabbit_received_at - published_at` | RabbitMQ delivery and queue wait. |
| `normalize_latency_ms` | `normalized_at - rabbit_received_at` | Team 2 validation/normalization cost. |
| `timescale_insert_latency_ms` | DB batch finish minus DB batch start | Sensor history write cost. |
| `detection_latency_ms` | `detected_at - abnormal_event_time` | Medical event to detector recognition. |
| `team3_detection_latency_ms` | Team 3 process duration | Detector CPU/RAM-state cost. |
| `alert_publish_latency_ms` | `alert_published_at - detected_at` | Time to publish `alerts.created`. |
| `supabase_insert_latency_ms` | `alert_inserted_at - detected_at` | Alert persistence cost. |
| `team4_subscribe_latency_ms` | `team4_received_at - alert_inserted_at` | Supabase realtime delivery after DB insert. |
| `team4_queue_latency_ms` | `team4_received_at - alert_published_at` | RabbitMQ alert delivery to Team 4. |
| `team4_receive_latency_ms` | `team4_received_at - abnormal_event_time` | End-to-end alert receive latency without UI rendering. |
| `true_e2e_user_latency_ms` | `team4_rendered_at - abnormal_event_time` | End-to-end user-visible alert latency. |
| `realtime_backend_latency_ms` | `alert_published_at - rabbit_received_at` | Backend realtime path excluding Team 1 and Team 4. |

## MVP Success Criteria

Functional:

- `ppi_batch` uses `ppi_intervals_ms[]`.
- Alerts publish with routing key `alerts.created`.
- Alert queue is `q.alerts.created`.
- Alert DB target is Supabase `public.alerts` and `public.alert_context`.
- Valid replay has `DLQ = 0`.
- Invalid payload creates `data.fault` and does not crash the worker.
- Low SpO2 creates `low_spo2`.
- Irregular PPI creates `stroke_risk`.
- Fall motion creates `fall_detected`.
- Team 4 probe receives expected alerts.
- Duplicate `alert_id` count is `0`.

Performance:

- p95 `queue_latency_ms` < 500 ms.
- p95 `normalize_latency_ms` < 50 ms.
- p95 `timescale_insert_latency_ms` < 500 ms.
- p95 `team3_detection_latency_ms` < 100 ms.
- p95 motion-heavy `team3_detection_latency_ms` < 300 ms.
- p95 `alert_publish_latency_ms` < 100 ms.
- p95 `supabase_insert_latency_ms` < 500 ms.
- p95 `team4_subscribe_latency_ms` < 500 ms to 1 s.
- p95 `team4_receive_latency_ms` < 2 s.
- If a real UI is available, p95 `true_e2e_user_latency_ms` < 2 s.

## Warning Criteria

- Queue depth increases for 3 consecutive sample windows.
- p95 or p99 latency increases steadily during one run.
- p95 `patient_lock_wait_ms` > 100 ms.
- p95 `supabase_insert_latency_ms` > 500 ms.
- Team 4 missed alert count > 0.
- Duplicate alert count > 0.

## Scale Interpretation

| Symptom | Likely bottleneck | Scale direction |
| --- | --- | --- |
| Queue depth grows and worker CPU is high | Normalize or detection workload | Add workers, partition by patient. |
| Queue depth grows and worker CPU is low | Consumer/prefetch/ack/config issue | Tune RabbitMQ consumer settings. |
| Timescale insert latency is high | DB/index/batch size | Tune batch size, reduce indexes, pool connections. |
| Supabase insert latency is high | Alert persistence in realtime path | Use async persistence/outbox, publish alert first. |
| Supabase realtime is slow or misses events | UI delivery path | Add backend notification service/WebSocket or Realtime Broadcast. |
| Motion-heavy runs slow every stream | Motion expansion/detection | Split motion worker or point-level feature pipeline. |
| Patient lock wait is high | Per-patient state contention | Partition by `patient_id`, then add Redis/state store. |

## Reporting To Mentor

For each demo, show:

- Run profile and parameters.
- Total messages published/consumed.
- Alerts expected/created/received.
- p95 and p99 backend latency.
- p95 Team 4 receive latency.
- Queue depth trend.
- Current bottleneck and next scale step.
