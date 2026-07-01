# Pipeline Jobs

Job entry points for the simulator pipeline.

## Main Job

```bash
cd backend
python -m simulator.pipeline.jobs.generate_and_replay
```

The job reads env vars, generates data for one or more patients, then publishes
the generated patient-directory files through the pipeline publisher.

Current simulator v2 output uses this layout:

```text
backend/simulator/output/P005/continuous.jsonl
backend/simulator/output/P005/ppi_batch.jsonl
backend/simulator/output/P005/motion_batch.jsonl
```

The job still falls back to older flat files like
`wearable_continuous_P005_24h.jsonl` when patient-directory files do not exist.

Local Docker Compose reads:

```text
backend/simulator/pipeline/jobs/.env
```

Start from:

```text
backend/simulator/pipeline/jobs/.env.example
```

Do not commit `.env`.

Common stream set:

```text
STREAMS=wearable_continuous wearable_steps_event wearable_stress wearable_ppi_batch wearable_motion_batch wearable_bp_triggered wearable_spo2_triggered wearable_ecg_triggered wearable_battery sleep_timeline daily_metrics
```

`PUBLISH_LIMIT` limits each JSONL stream during dry-runs and smoke tests.
