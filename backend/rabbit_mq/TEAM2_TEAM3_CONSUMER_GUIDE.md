# Team 2+3 Consumer Guide

Team 2 and Team 3 run together as one realtime alert engine:

```text
RabbitMQ wearable queues
  -> Team 2 validation / feature engineering
  -> Team 3 anomaly detection
  -> database history / alert detail
  -> alerts.created
```

This guide explains how Team 2+3 should use the shared files in
`backend/rabbit_mq` and how to consume each wearable signal consistently.

## Shared RabbitMQ Files

Use `backend/rabbit_mq` as the shared broker contract. Team-specific workers
should live in the Team 2+3 service folder, not inside this package.

| File | Team 2+3 should use it for |
|---|---|
| `rabbitmq.py` | Load `RABBITMQ_URL`, connect to RabbitMQ, declare shared topology, get persistent JSON properties, apply QoS |
| `config/topology_config.py` | Single source of truth for exchange names, queue keys, queue names, routing keys, consumer prefetch settings |
| `README.md` | High-level topology and dataflow |
| `TEAM2_TEAM3_CONSUMER_GUIDE.md` | Consumer rules, queue-to-signal mapping, dispatch examples |

Do not hard-code queue names or routing keys in Team 2+3 workers when the
shared config can provide them. Prefer `settings.queue("wearable_continuous")`
over writing `q.team2.wearable_continuous` directly.

## Recommended Queue Design

Queue setup is split by processing shape and frequency:

- keep 1 Hz realtime PPG separate so it cannot block lower-frequency streams;
- keep 60s summaries separate by schema for easier validation, monitoring, and
  targeted scaling;
- keep motion batch separate because payloads can be heavier;
- keep BP, SpO2, and ECG in one triggered queue because they are sparse and
  include `event_type` / `trigger_type`;
- keep daily sleep and daily metrics separate from realtime streams.

| Queue key in config | Queue name | Routing key bindings | Signals in payload | Frequency |
|---|---|---|---|---|
| `wearable_continuous` | `q.team2.wearable_continuous` | `wearable.continuous` | `heart_rate`, `respiratory_rate` | 1 Hz |
| `wearable_steps_event` | `q.team2.wearable_steps_event` | `wearable.steps_event` | `steps_count`, `steps_rate_per_min`, `activity_type`, `interval_seconds` | 60s |
| `wearable_stress` | `q.team2.wearable_stress` | `wearable.stress` | `stress_score`, `stress_level`, `interval_seconds` | 60s |
| `wearable_ppi_batch` | `q.team2.wearable_ppi_batch` | `wearable.ppi_batch` | `ppi_intervals_ms[]`, `interval_seconds` | ~15s |
| `wearable_motion_batch` | `q.team2.wearable_motion_batch` | `wearable.motion_batch` | `motion_points[].acc_magnitude`, `motion_points[].gyro_magnitude`, `window_start`, `window_end` | batch/window |
| `wearable_bp_triggered` | `q.team2.wearable_triggered` | `wearable.bp_triggered` | `systolic_bp`, `diastolic_bp`, `event_type`, `trigger_type` | 30m |
| `wearable_spo2_triggered` | `q.team2.wearable_triggered` | `wearable.spo2_triggered` | `spo2`, `event_type`, `trigger_type` | 30m |
| `wearable_ecg_triggered` | `q.team2.wearable_triggered` | `wearable.ecg_triggered` | `ecg_points`, `ecg_lead`, `ecg_sampling_rate_hz`, `ecg_duration_seconds`, `event_type`, `trigger_type` | daily |
| `wearable_battery` | `q.team2.wearable_battery` | `wearable.battery` | `battery_level` | 30m |
| `sleep_timeline` | `q.team2.sleep_timeline` | `wearable.sleep_timeline` | `sleep_duration_min`, `detail[].state`, `detail[].duration_min` | daily |
| `daily_metrics` | `q.team2.daily_metrics` | `wearable.daily_metrics` | `hrv_rmssd_morning` | daily |

Non-realtime/offline simulator files use the seed loader, not RabbitMQ, in the
current MVP: `lab_results.json`, `activity_timeline.json`,
`abnormal_episodes.json`, and `fault_log.json`.

## Worker Startup

Each Team 2+3 worker should load the shared settings, open a connection, and
declare the topology before consuming. Declaration is idempotent for normal use
and ensures local/dev brokers have the expected queues and bindings.
Use `declare_topology`; `declare_team1_topology` remains only as a backward
compatible alias for older Team 1 publisher code.

```python
from rabbit_mq.rabbitmq import RabbitMQSettings, connect, declare_topology

settings = RabbitMQSettings.from_env()
connection = connect(settings)
channel = connection.channel()

declare_topology(channel, settings)
```

For one worker per queue, resolve the queue through the shared config:

```python
queue = settings.queue("wearable_continuous")
channel.basic_qos(
    prefetch_count=settings.consumer_options("wearable_continuous")["prefetch_count"]
)
channel.basic_consume(
    queue=queue["name"],
    on_message_callback=on_message,
    auto_ack=False,
)
channel.start_consuming()
```

If one process consumes multiple queues with different prefetch settings, use
separate channels per queue group. RabbitMQ QoS is channel-scoped, so sharing one
channel makes all queues on that channel use the same prefetch behavior.

## Dispatch Rules

Team 2+3 should identify the exact stream from RabbitMQ `method.routing_key`.
Do not infer stream type from fields alone.

```python
import json


TRIGGERED_KEYS = {
    "wearable.bp_triggered",
    "wearable.spo2_triggered",
    "wearable.ecg_triggered",
}


def on_message(ch, method, properties, body):
    routing_key = method.routing_key
    record = json.loads(body)

    try:
        if routing_key == "wearable.continuous":
            handle_continuous(record)
        elif routing_key == "wearable.steps_event":
            handle_steps(record)
        elif routing_key == "wearable.stress":
            handle_stress(record)
        elif routing_key == "wearable.ppi_batch":
            handle_ppi_batch(record)
        elif routing_key == "wearable.motion_batch":
            handle_motion_batch(record)
        elif routing_key in TRIGGERED_KEYS:
            handle_triggered(routing_key, record)
        elif routing_key == "wearable.battery":
            handle_battery(record)
        elif routing_key == "wearable.sleep_timeline":
            handle_sleep(record)
        elif routing_key == "wearable.daily_metrics":
            handle_daily_metrics(record)
        else:
            raise ValueError(f"Unknown routing key: {routing_key}")
    except Exception:
        # Log the error, optionally publish data.fault, then reject without requeue
        # if the message is invalid for this contract.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    ch.basic_ack(delivery_tag=method.delivery_tag)


def handle_triggered(routing_key, record):
    if record.get("event_type") != routing_key:
        raise ValueError(
            f"event_type={record.get('event_type')} does not match {routing_key}"
        )

    trigger_type = record.get("trigger_type")
    if trigger_type == "blood_pressure":
        handle_blood_pressure(record)
    elif trigger_type == "spo2":
        handle_spo2(record)
    elif trigger_type == "ecg":
        handle_ecg(record)
    else:
        raise ValueError(f"Unknown trigger_type: {trigger_type}")
```

## Avoid Signal Confusion

Some fields have similar names but different semantics depending on the stream.
Always use `method.routing_key` plus the required timing fields.

| Field / concept | Stream | Meaning |
|---|---|---|
| `ppi_intervals_ms` | `wearable.ppi_batch` | Beat-level PPI/RR array for realtime AFib detection; store full array in `ppi_patches` and `raw_sensor_events` |
| `hrv_rmssd_morning` | `wearable.daily_metrics` | Daily HRV baseline/context, not realtime |
| `activity_type` | `wearable.steps_event` | Activity context for the 60s steps window |
| `motion_points` | `wearable.motion_batch` | Timestamped motion points with `acc_magnitude` and `gyro_magnitude` inside `[window_start, window_end]` |

## Timing And Idempotency

Use `message_id` as the idempotency key for JSONL event streams. Sleep timeline
and daily metrics are patient-level daily JSON files, so use their date/time
fields when `message_id` is absent.

| Stream shape | Required timing fields | Suggested idempotency key |
|---|---|---|
| JSONL point event | `message_id`, `patient_id`, `device_id`, `timestamp` | `message_id` |
| 60s summary | `message_id`, `timestamp`, `interval_seconds` | `message_id` |
| Batch/window | `message_id`, `window_start`, `window_end` | `message_id` |
| Triggered measurement | `message_id`, `event_type`, `trigger_type`, `timestamp` | `message_id` |
| Sleep timeline | `patient_id`, `date`, `start_time` | `patient_id:date:start_time` |
| Daily metrics | `patient_id`, `date`, `measured_at` | `patient_id:date:measured_at` |

## Building Combined Features

For the realtime MVP, Team 3 runs inside the Team 2 consumer process and uses
RAM state, not DB polling and not `q.team3.features`. Guard calls into the
stateful engine with a per-`patient_id` lock because Team 2 consumes several
RabbitMQ queues on separate threads.

When Team 3 needs a combined feature at event time `T`, use the RAM snapshot by
`patient_id` / `device_id` and event time:

- use the latest `wearable.continuous` record at or before `T` for HR and RR;
- use interval/window records whose `timestamp` or `[window_start, window_end]`
  covers `T` for steps, stress, PPI patches, and motion context;
- use the latest BP, SpO2, and battery measurements at or before `T`;
- use daily sleep and HRV metrics as patient-day context.
- expand `motion_points` by timestamp and feed each point to the fall detector
  in order;
- feed `ppi_intervals_ms[]` to AFib detection as the realtime source.

Store normalized records and feature snapshots in the database. Use the
temporary state store only for short-lived rolling windows, latest state,
dedupe keys, and alert cooldowns.

## Publishing Outputs

Team 2+3 publishes two broker outputs:

| Routing key | Queue | Purpose |
|---|---|---|
| `alerts.created` | `q.alerts.created` | Realtime alert notification for Team 4 |
| `data.fault` | `q.team1.data_fault` | Invalid/missing/out-of-contract data feedback for Team 1 |

Alert payloads should include at least `alert_id`, `patient_id`, `device_id`,
`timestamp`, `alert_type`, `severity`, `feature_snapshot`, `source_event_ids`,
`model_version` or `rule_version`, and `dedupe_key`.
