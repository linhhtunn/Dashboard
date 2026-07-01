# Realtime Frontend Simulator

This mode lets the frontend `/metrics` tab control the Python wearable simulator directly.
It is separate from the batch generator, so existing file generation and replay jobs still work.

## Architecture

```text
Frontend /metrics
  -> Next API proxy /api/simulator/*
  -> FastAPI service backend/simulator/realtime/server.py
  -> in-memory RealtimeSimulationRun
  -> optional RabbitMQ publish using shared health.events topology
```

Batch mode still uses:

```text
simulator.core.generate_patient_simulation
-> JSON/JSONL files
-> simulator.pipeline.publisher.replay_generated_data
```

Realtime mode uses the same signal rules where possible:

- patient profile generation from `profile_generator.py`
- activity effects and smoothing from `wearable_signals.py`
- abnormal event config from `wearable_reference_config.py`
- PPI key: `ppi_intervals_ms`
- motion key: `motion_points[].acc_magnitude` and `motion_points[].gyro_magnitude`

## Run Locally

Install backend dependencies:

```bash
cd backend
pip install -r simulator/realtime/requirements.txt
```

Start the realtime simulator API:

```bash
cd backend
uvicorn simulator.realtime.server:app --host 127.0.0.1 --port 8021 --reload
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000/metrics
```

The frontend proxies requests to:

```text
SIMULATOR_API_BASE=http://127.0.0.1:8021
```

## Use The Tab

1. Set patient profile: age, gender, lifestyle, health status, risk factors.
2. Choose patient mode:
   - `Sandbox`: local-only simulator patient, safe for UI testing, cannot publish RabbitMQ.
   - `Existing`: use a patient already in the Team4/Supabase roster; RabbitMQ publish can be enabled.
3. Click `Create run`.
4. Click `Start`.
5. Change activity while running: resting, sitting, standing, walking, vigorous_activity, sleep.
6. Select abnormal event and duration, then click `Inject now`.
7. Watch:
   - live HR/RR/SpO2/BP chart
   - PPI/HRV panel
   - motion panel
   - raw feed table
   - ground truth panel

Activity and abnormal state are independent. You can be walking and then inject a fall, or be resting and inject AFib, without resetting the run.

## RabbitMQ Publish

RabbitMQ publish is disabled by default so local UI tests do not write to shared queues.

Publish is only allowed for `Existing` patient runs. `Sandbox` runs are forced local-only by both the frontend and backend so simulator testing does not create extra patients or pollute Team4/Team5 views.

Enable for one existing-patient run from the tab with the `Publish RabbitMQ` toggle, or make it default for existing-patient runs:

```bash
set SIMULATOR_PUBLISH_RABBITMQ=true
```

Optional env file for RabbitMQ settings:

```bash
set SIMULATOR_RABBITMQ_ENV=backend/.env
```

Published streams use the existing shared topology:

```text
wearable.continuous     -> q.team2.wearable_continuous
wearable.ppi_batch      -> q.team2.wearable_ppi_batch
wearable.motion_batch   -> q.team2.wearable_motion_batch
wearable.bp_triggered   -> q.team2.wearable_bp_triggered
wearable.spo2_triggered -> q.team2.wearable_spo2_triggered
wearable.steps_event    -> q.team2.wearable_steps_event
wearable.stress         -> q.team2.wearable_stress
```

Ground truth is not published to RabbitMQ. For existing-patient publishable runs, the simulator can persist ground truth to `public.scenario_ground_truth` for Grafana evaluation. It does not create or upsert patients; the selected patient must already exist in Supabase.

## Verify End To End

1. Start RabbitMQ / CloudAMQP env.
2. Start Team 2+3 worker.
3. Start realtime simulator API.
4. Start frontend and create an `Existing` patient run.
5. Turn on `Publish RabbitMQ`.
6. Start the run and inject one abnormal event.
7. Confirm:
   - raw feed rows show `sent`
   - Team 2 consumes `q.team2.*`
   - Timescale receives raw/normalized rows
   - Team 3 receives RAM samples from Team 2
   - alerts appear only from Team 3 detection, not from simulator ground truth

## MVP Limits

- Runtime state is in memory; restart loses samples, cooldown, and ground truth log.
- One process owns active runs; there is no Redis/state store yet.
- RabbitMQ publish happens in the simulator path, so a slow broker can add latency.
- The frontend polls snapshots; no websocket/SSE stream yet.
- Ground truth is an observation aid, not a persistent database workflow.

## Future Direction

- Add SSE or websocket snapshots for smoother UI.
- Add Redis for restart-safe run state and shared multi-process state.
- Add an export endpoint for ground truth JSON.
- Add cloud deployment as a long-running worker/API service.
- Add perf trace fields for publish latency and Team 4 alert receive latency.
- Add optional automatic timeline mode after the manual observation MVP is stable.
