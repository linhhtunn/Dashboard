# Team Database Usage Guide

Huong dan nay danh cho Team 2, Team 3, Team 4 khi can doc/ghi database.

## Doc file nao truoc?

- Data flow tong quan: `05-data-flow.md`
- Supabase app schema: `03-supabase-app-model.md`
- TigerData/Timescale schema: `04-timescale-sensor-model.md`
- Simulator stream contract: `07-simulator-stream-contract.md`
- Test/benchmark: `08-test-plan.md`

## Thu muc nao dung de lam gi?

| Thu muc | Team can dung | Vai tro |
| --- | --- | --- |
| `config/` | Team 2, 3, 4 | Env vars: `SUPABASE_URL`, `SUPABASE_DB_URL`, `TIMESCALE_DB_URL`, `TIMESCALE_DB_PASSWORD`, `RABBITMQ_URL` |
| `clients/` | Team 2, 3 | Tao ket noi DB/event bus, khong viet business logic o day |
| `schemas/` | Team 2, 3 | Pydantic validate row truoc khi insert |
| `repositories/` | Team 2, 3, 4 backend | Ham insert/upsert/query DB |
| `migrations/` | Dev/backend owner | SQL schema source of truth |
| `ci/` | Dev/backend owner | Verify schema, smoke test, apply migration |
| `benchmarks/` | Dev/backend owner, Team 2 | Do insert/upsert/query performance |

## Client la gi?

`clients/` chi lam viec ket noi:

- `SupabaseDbClient`: ket noi Supabase Postgres app DB bang `SUPABASE_DB_URL`.
- `TimescaleClient`: tao connection pool toi TigerData/TimescaleDB bang `TIMESCALE_DB_URL` + optional `TIMESCALE_DB_PASSWORD`.
- `rabbitmq_client.py`: tao RabbitMQ connection bang `RABBITMQ_URL`.

Team khong nen goi SQL truc tiep tu client neu da co repository tuong ung. Pattern nen la:

```text
payload
-> schema validate
-> repository insert/query
-> client connection
-> database
```

## Team 2: Cleaning / Normalization / Ingestion

Team 2 doc RabbitMQ/simulator payload, validate, clean, normalize, roi ghi vao TigerData.

Team 2 nen dung:

- `schemas/timeseries.py`
- `repositories/timeseries_repository.py`
- `clients/timescale_client.py` thong qua repository

Bang Team 2 se ghi:

- `raw_sensor_events`: luu payload goc de debug/reprocess.
- `wearable_continuous`: HR/RR/PPI realtime.
- `wearable_intervals`: steps/stress/PPI 60s window.
- `wearable_measurements`: BP/SpO2/battery.
- `motion_batches`: ACC/GYRO batch JSONB.
- `ecg_measurements`: ECG measurement/waveform summary.
- `sleep_sessions`, `sleep_stage_intervals`: sleep data.
- `daily_hrv_metrics`: daily HRV.
- `latest_sensor_values`: upsert latest cache cho dashboard.

Example:

```python
from datetime import UTC, datetime

from database.repositories import TimescaleRepository
from database.schemas.timeseries import WearableContinuous, LatestSensorValue

repo = TimescaleRepository()

sample = WearableContinuous(
    time=datetime.now(UTC),
    message_id="msg_001",
    patient_id="P001",
    device_id="DEV_P001_WATCH",
    heart_rate=78,
    respiratory_rate=16,
)

repo.insert_wearable_continuous([sample])

repo.upsert_latest_values([
    LatestSensorValue(
        patient_id="P001",
        device_id="DEV_P001_WATCH",
        metric="heart_rate",
        value_numeric=78,
        unit="bpm",
        last_measured_at=sample.time,
        stream_name="wearable_continuous",
    )
])
```

Ingest production nen batch 100-500 rows:

```text
RabbitMQ messages
-> buffer theo destination table
-> repo.insert_...(batch)
-> DB commit thanh cong
-> ACK RabbitMQ
```

## Team 3: Feature / Anomaly / Alert Engine

Team 3 doc data tu TigerData, tao features/anomaly, roi ghi:

- `health_features` vao TigerData.
- `alerts` va `alert_context` vao Supabase.

Team 3 nen dung:

- `TimescaleRepository.fetch_continuous_window(...)`
- `TimescaleRepository.insert_health_features(...)`
- `SupabaseAppRepository.create_alert(...)`
- `schemas/timeseries.HealthFeature`
- `schemas/app.AlertCreate`
- `schemas/app.AlertContextCreate`

Example alert:

```python
from datetime import UTC, datetime, timedelta

from database.repositories import SupabaseAppRepository
from database.schemas.app import AlertCreate, AlertContextCreate

repo = SupabaseAppRepository()
now = datetime.now(UTC)

alert = AlertCreate(
    alert_id="ALERT_P001_LOW_SPO2_001",
    patient_id="P001",
    device_id="DEV_P001_WATCH",
    alert_type="low_spo2",
    severity="high",
    alert_time=now,
    reason="SpO2 dropped below threshold",
    confidence=0.92,
    features={"min_spo2": 88},
    source="team3_anomaly",
)

context = AlertContextCreate(
    alert_id=alert.alert_id,
    patient_id=alert.patient_id,
    window_start=now - timedelta(minutes=10),
    window_end=now + timedelta(minutes=5),
    summary={"min_spo2": 88, "avg_heart_rate": 102},
    chart_query_params={"patient_id": "P001", "window": "15min"},
)

repo.create_alert(alert, context)
```

## Team 4: Dashboard / Backend API

Team 4 thuong khong nen query DB truc tiep tu frontend. Nen goi backend API, backend API dung repositories.

Team 4 can doc:

- Supabase app tables: `patients`, `patient_lab_results`, `devices`, `device_sensors`, `alerts`, `alert_context`, `alert_reviews`, `staff_shifts`.
- TigerData query tables: `latest_sensor_values`, `wearable_continuous`, `wearable_intervals`, `wearable_measurements`, `sleep_sessions`, `sleep_stage_intervals`.

Backend query patterns:

- Patient profile: Supabase `patients`.
- Lab panel: Supabase `patient_lab_results`.
- Alert list: Supabase `alerts`.
- Alert detail/chart params: Supabase `alert_context`.
- Latest cards: TigerData `latest_sensor_values`.
- Chart time window: TigerData `wearable_continuous` / `wearable_intervals`.
- Sleep timeline: TigerData `sleep_sessions` + `sleep_stage_intervals`.

Example backend query:

```python
from datetime import UTC, datetime, timedelta

from database.repositories import TimescaleRepository

repo = TimescaleRepository()
end = datetime.now(UTC)
start = end - timedelta(hours=1)

rows = repo.fetch_continuous_window("P001", start, end)
```

## Env setup

Local/dev can use `backend/database/config/.env`.

Required for TigerData:

```text
TIMESCALE_DB_URL=postgres://USER@HOST:PORT/tsdb?sslmode=require
TIMESCALE_DB_PASSWORD=...
```

Hoac nhung password truc tiep vao URL:

```text
TIMESCALE_DB_URL=postgres://USER:PASSWORD@HOST:PORT/tsdb?sslmode=require
```

Required for Supabase DB scripts:

```text
SUPABASE_DB_URL=postgresql://...
```

Trong project nay Supabase migration da duoc apply bang Supabase connector, nen `SUPABASE_DB_URL` chua bat buoc cho Team 2/3 neu chi dung backend/service layer sau nay.

## Test sau khi team insert/query

Verify schema:

```bash
python database/ci/verify_schema.py --database tigerdata
```

Smoke test:

```bash
python database/ci/smoke_test.py --database tigerdata --yes
```

Benchmark:

```bash
python database/benchmarks/run_timescale_benchmark.py --yes
```

## Nguyen tac quan trong

- Khong insert tung row mot neu data nhieu; dung batch 100-500 rows.
- Chi ACK RabbitMQ sau khi DB commit thanh cong.
- Dung `message_id` + `ON CONFLICT` de tranh duplicate.
- Khong them index moi khi chua co query that can no.
- Team 2/3 insert TigerData qua repository, khong copy SQL lung tung trong service.
- Team 4/frontend khong expose service role key.
