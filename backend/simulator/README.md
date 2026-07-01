# Wearable Simulator Component

Team 1 wearable simulator component.

## Layout

```text
simulator/
  core/       # synthetic wearable data generation
  realtime/   # FastAPI runtime for the frontend /metrics tab
  streaming/  # headless realtime runner for CLI/cloud/load tests
  pipeline/   # Docker/cron job, replay publisher, smoke-test mocks
  output/     # generated JSON/JSONL files, ignored by git
```

Shared RabbitMQ connection/topology code stays in `backend/rabbit_mq`.

## What To Run

Generate data only:

```bash
cd backend
python -m simulator.core.generate_patient_simulation
```

Replay generated files only:

```bash
cd backend
python -m simulator.pipeline.publisher.replay_generated_data --patient-id P005 --dry-run --limit 5
```

Run the realtime simulator API for the frontend `/metrics` tab:

```bash
cd backend
uvicorn simulator.realtime.server:app --host 127.0.0.1 --port 8021 --reload
```

## Headless Realtime Streaming CLI

`streaming/` runs the same realtime signal and payload logic as the frontend
simulator, but it has no browser/FastAPI dependency. Use it for:

- generating new sandbox patients from config/profile rules,
- running many patients at once,
- scheduled abnormal scenarios,
- RabbitMQ streaming tests,
- cloud workers and load tests.

### Generate New Sandbox Patients

Generate 3 new simulator-only patients and run 120 simulation seconds. This
does not publish to RabbitMQ and does not require Supabase patients:

```bash
cd backend
python -m simulator.streaming --patient-count 3 --duration-seconds 120 --speed 10 --no-sleep
```

Each sandbox patient gets an auto ID like `SIM-<RUN_ID_8_CHARS>`.

Run one new patient in realtime speed and keep normal sleeping/resting behavior:

```bash
cd backend
python -m simulator.streaming \
  --patient-count 1 \
  --duration-seconds 300 \
  --speed 1 \
  --activity resting
```

Run new generated patients with profile config:

```bash
cd backend
python -m simulator.streaming \
  --patient-count 5 \
  --age 72 \
  --gender female \
  --lifestyle low_activity \
  --health-status WARNING \
  --risk-factors hypertension_risk fall_risk low_spo2_risk \
  --duration-seconds 600 \
  --speed 10 \
  --no-sleep
```

### Publish Existing Patients To RabbitMQ

Publishing is only allowed for `--patient-source existing` and explicit patient
IDs. This avoids accidentally creating noisy fake patient IDs in shared Team 4/5
views.

```bash
cd backend
python -m simulator.streaming \
  --patient-source existing \
  --patients P001 P002 \
  --publish \
  --duration-seconds 300 \
  --speed 5 \
  --abnormal spo2_drop:30:180 \
  --abnormal fall_event:120:30
```

Add Supabase patient validation before publish:

```bash
cd backend
python -m simulator.streaming \
  --patient-source existing \
  --patients P001 \
  --publish \
  --validate-existing-patient \
  --duration-seconds 180 \
  --abnormal spo2_drop:20:180
```

### Abnormal Schedule Format

Use `--abnormal episode_type:at_second:duration_seconds`.

Examples:

```bash
--abnormal spo2_drop:30:180
--abnormal fall_event:120:30
--abnormal afib_episode:180:300
--abnormal hypertension_episode:60:600
--abnormal tachycardia:45:300
--abnormal bradycardia:45:300
--abnormal stress_episode:90:480
```

You can repeat `--abnormal` to schedule multiple events in one run.

### Common CLI Parameters

```text
--patient-count N
  Number of new sandbox patients to generate when --patients is omitted.

--patients P001 P002
  Explicit patient IDs. Required when --publish is used.

--patient-source sandbox|existing
  sandbox creates simulator-only patients. existing uses shared patient IDs.

--publish
  Publish generated wearable.* messages to RabbitMQ. Requires existing patients.

--validate-existing-patient
  Check patient exists in Supabase before publishing.

--duration-seconds N
  Number of simulation seconds to run.

--speed 1|5|10|30
  Simulation speed. speed=10 means 10 simulation seconds per wall second.

--no-sleep
  Replay as fast as possible. Useful for load/performance tests.

--activity resting|sitting|standing|walking|vigorous_activity|sleep
  Initial activity state.

--risk-factors ...
  Risk factors used by profile generation. Examples:
  hypertension_risk fall_risk low_spo2_risk afib_risk diabetes_risk anemia_risk

--env-path PATH
  Env file for RabbitMQ/database URLs. Defaults to backend/database/config/.env.
```

### Required Config For Publish

For dry-run sandbox mode, no RabbitMQ/Supabase config is required.

For `--publish`, make sure `backend/database/config/.env` or the file passed to
`--env-path` contains at least:

```text
RABBITMQ_URL=...
```

For `--validate-existing-patient`, also set:

```text
SUPABASE_DB_URL=...
```

### Outputs

Headless CLI prints run IDs, patient IDs, publish counters, pending publisher
queue size, and dropped message count. It does not write JSONL files; it streams
in memory and optionally publishes to RabbitMQ. Use `core.generate_patient_simulation`
when you need persisted JSON/JSONL files.

Detailed realtime E2E demo checklist:

```text
simulator/docs/realtime_e2e_demo_guide.md
```

Default run-level settings live in:

```text
simulator/core/config/default_generation_config.py
```

The non-tech config selects the patient, health mode, start time, duration,
seed, and whether wearable fault injection is enabled.

## Active Outputs

Generated files are written to:

```text
backend/simulator/output/
```

Clean wearable outputs:

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
{patient_id}/abnormal_episodes.json
```

Fault log output, when `FAULT_INJECTION_ENABLED = True`:

```text
wearable_fault_log_{suffix}.json
```

When fault injection is enabled, injected records are written to the same
`wearable_*` output files. Separate clean/faulty stream files are not created.

See the full output contract:

```text
backend/simulator/core/docs/wearable_simulator_expected_output.md
```

## Active v2 Files

- `core/generate_patient_simulation.py`: main CLI entry point.
- `core/generation_config.py`: loads the v2 run config and output file names.
- `core/profile_generator.py`: Monte Carlo patient profile generator.
- `core/profiles.py`: loads patient profiles.
- `core/wearable_timeline.py`: generates master sleep/activity timeline.
- `core/wearable_signals.py`: generates continuous, triggered, and daily wearable signals.
- `core/abnormal_events.py`: shared abnormal event selection, manual injection, and ground truth helpers.
- `core/wearable_faults.py`: injects wearable-aware data quality faults.
- `core/exporters.py`: writes JSON and JSONL files.
- `core/config/default_generation_config.py`: non-tech run config for one generated user.
- `core/config/profile_generation_config.py`: demographic, pregnancy, lifestyle, and risk profile rules.
- `core/config/wearable_reference_config.py`: activity effects, sleep rules, signal noise rules.
- `core/config/wearable_dev_config.py`: output file names, windows, trigger schedule, ECG config.
- `core/config/fault_injector_config.py`: wearable fault injection probabilities.

## Wearable v2 Logic

Continuous output is emitted every second.

Each generated profile includes a v2 `wearable_baseline` used by the signal and
timeline generators:

```text
resting_heart_rate
respiratory_rate
ppi_resting_mean_ms
ppi_resting_std_ms
stress_score
spo2
hrv_rmssd_morning
daily_step_tendency
sleep_start_offset_minutes
sleep_duration_tendency_minutes
sleep_fragmentation_tendency
deep_sleep_tendency
rem_sleep_tendency
ppg_noise_level
ppg_amplitude
ecg_rhythm
```

`heart_rate` is derived from PPI, while `respiratory_rate` is tracked as RR:

```python
WINDOWS = {
    "ppi_seconds": 30,
}
```

Continuous fields:

```text
heart_rate
ppi_std_ms
respiratory_rate
altitude_m
battery_level
```

Triggered fields:

```text
blood pressure
spo2
ecg waveform points
```

Daily fields:

```text
hrv_rmssd_morning
```

Awake activity effects start from a base activity table and are adjusted by
`age_group` plus `lifestyle`, so the same `walking` segment affects a young
active profile differently from an elderly low-activity profile.

Sleep is generated as a night block with realistic jitter, stage cycles, and
micro-awake segments. The simulator emits only raw `sleep_timeline`; sleep
metrics and quality scores are downstream Team 2 processing.

## Quick Checks

Compile:

```bash
cd backend
python -m compileall simulator
```

Generate then replay with env-driven patient/time config:

```bash
cd backend
python -m simulator.pipeline.jobs.generate_and_replay
```

Docker/Render entrypoint:

```text
python -m simulator.pipeline.jobs.generate_and_replay
```

Read next:

- `core/README.md` for generation config and outputs.
- `docs/realtime_frontend_simulator.md` for the frontend-controlled realtime simulator.
- `pipeline/README.md` for Docker, local env, replay, RabbitMQ, and Render Cron Job setup.
