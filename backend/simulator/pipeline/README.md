# Simulator Pipeline

Team 1 pipeline layer for generated wearable data.

This package owns:

- Docker image for the simulator job.
- Local job env template.
- Generate-and-replay job wrapper.
- Replay publisher for generated files.
- Mock/smoke-test helpers used by the simulator publishing flow.

Shared RabbitMQ connection and topology helpers remain in `backend/rabbit_mq`.

Runtime Python dependencies for this pipeline image live in:

```text
backend/simulator/pipeline/requirements.txt
```

## Local Env

Copy the local env template:

```powershell
cd C:\Users\ADMIN\software-engineering
Copy-Item backend/simulator/pipeline/jobs/.env.example backend/simulator/pipeline/jobs/.env
```

Edit:

```text
backend/simulator/pipeline/jobs/.env
```

Safe dry-run defaults:

```text
PATIENT_IDS=P005
DURATION_HOURS=1
PUBLISH_LIMIT=5
DRY_RUN=true
```

For real RabbitMQ publishing:

```text
DRY_RUN=false
RABBITMQ_URL=amqps://USER:PASSWORD@HOST/VHOST
```

Do not commit `.env`.

## Local Python

Generate then replay:

```bash
cd backend
python -m simulator.pipeline.jobs.generate_and_replay
```

Replay existing generated files only:

```bash
cd backend
python -m simulator.pipeline.publisher.replay_generated_data --patient-id P005 --dry-run --limit 5
```

## Docker Compose

From the repository root:

```powershell
docker compose -f backend/simulator/pipeline/compose.yml build wearable-job
docker compose -f backend/simulator/pipeline/compose.yml run --rm wearable-job
```

Or from the pipeline folder:

```powershell
cd backend/simulator/pipeline
docker compose -f compose.yml build wearable-job
docker compose -f compose.yml run --rm wearable-job
```

The pipeline compose file reads only:

```text
backend/simulator/pipeline/jobs/.env
```

It does not use a root `.env`.

## Docker Direct

Build:

```powershell
docker build -f backend/simulator/pipeline/Dockerfile -t wearable-backend-job ./backend
```

Run dry-run:

```powershell
docker run --rm `
  -e PATIENT_IDS=P005 `
  -e DURATION_HOURS=1 `
  -e PUBLISH_LIMIT=5 `
  -e DRY_RUN=true `
  wearable-backend-job
```

## Render Cron Job

Use Docker runtime.

```text
Root Directory: backend
Dockerfile Path: simulator/pipeline/Dockerfile
Command: python -m simulator.pipeline.jobs.generate_and_replay
```

Example daily schedule for 15:30 Asia/Saigon:

```text
30 8 * * *
```

Set env vars in Render, not in a committed file:

```text
PATIENT_IDS=P005
START_TIME=2026-06-03T05:00:00Z
DURATION_HOURS=24
STREAMS=wearable_continuous wearable_steps_event wearable_stress wearable_ppi_batch wearable_motion_batch wearable_bp_triggered wearable_spo2_triggered wearable_ecg_triggered wearable_battery sleep_timeline daily_metrics
REPLAY_MODE=interleaved
REPLAY_DELAY_SECONDS=1
DRY_RUN=false
NO_DECLARE=false
RABBITMQ_URL=<CloudAMQP AMQP URL>
```

## Smoke Mocks

```bash
cd backend
python -m simulator.pipeline.tests.mock_team2_worker --limit 10
python -m simulator.pipeline.tests.mock_team3_worker --limit 10
```
