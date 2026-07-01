# Simulator Core

Core synthetic wearable data generator. This package does not publish to
RabbitMQ and does not own Docker or cron configuration.

## Requirements

The core generator uses the Python standard library only. Use Python 3.10+.

If you are running it inside the full backend environment, install shared backend
dependencies from the backend root:

```bash
cd backend
python -m pip install -r requirements.txt
```

## Generate

```bash
cd backend
python -m simulator.core.generate_patient_simulation
```

Override patient/time from the CLI:

```bash
python -m simulator.core.generate_patient_simulation \
  --patient-id P005 \
  --start-time 2026-06-03T05:00:00Z \
  --duration-hours 24
```

Default run-level settings:

```text
simulator/core/config/default_generation_config.py
```

The generated files are written outside the source package:

```text
backend/simulator/output/
```

## Active Outputs

```text
{patient_id}/patient_info.json
{patient_id}/continuous.jsonl
{patient_id}/steps_event.jsonl
{patient_id}/stress.jsonl
{patient_id}/ppi_batch.jsonl
{patient_id}/motion_batch.jsonl
{patient_id}/bp_triggered.jsonl
{patient_id}/spo2_triggered.jsonl
{patient_id}/battery.jsonl
{patient_id}/ecg_triggered.jsonl
{patient_id}/sleep_timeline.json
{patient_id}/daily_metrics.json
{patient_id}/fault_log.json
```

The current implementation emits split wearable streams. Continuous carries
heart rate and respiratory rate only; PPI, motion, stress, steps, triggered
measurements, battery, ECG, sleep, and daily metrics are generated separately.

Full output contract:

```text
backend/simulator/core/docs/wearable_simulator_expected_output.md
```

## Quick Check

```bash
cd backend
python -m compileall -q simulator/core
python -m simulator.core.generate_patient_simulation --duration-hours 1
```
