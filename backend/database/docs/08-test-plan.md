# Database Test Plan

Muc tieu: biet migration da tao dung bang/cot/index, insert/upsert khong duplicate, query dashboard chay duoc, va co so lieu toc do ingest/query.

## 1. Schema verification

Chay sau khi apply migration:

```bash
python database/ci/verify_schema.py --database supabase
python database/ci/verify_schema.py --database tigerdata
```

Can pass:

- Supabase co du 13 bang app/workflow.
- TigerData co du 11 bang sensor/time-series.
- Cac cot quan trong ton tai.
- TigerData co hypertable cho high-volume tables.
- `ecg_measurements` va `sleep_stage_intervals` van la normal table trong MVP.

## 2. Smoke insert/upsert

Chay sau khi schema verification pass:

```bash
python database/ci/smoke_test.py --database supabase --yes
python database/ci/smoke_test.py --database tigerdata --yes
```

Can pass:

- Insert/upsert patient/device/sensor/alert Supabase.
- Insert 1 row cho moi bang TigerData.
- Upsert `latest_sensor_values`.
- Duplicate/idempotency khong tao row lap voi key da dinh nghia.

## 3. Query correctness

Can test cac query chinh:

- latest values by patient: `latest_sensor_values`.
- chart continuous by patient/time window: `wearable_continuous`.
- interval query by `interval_type`: `wearable_intervals`.
- measurements by `measurement_type`: `wearable_measurements`.
- sleep timeline by session/date: `sleep_sessions` + `sleep_stage_intervals`.
- alert list by status/shift/patient: Supabase `alerts`.

## 4. Performance benchmark

Chay sau khi TigerData migration pass:

```bash
python database/benchmarks/run_timescale_benchmark.py --yes
```

Script se do:

- batch insert 100/500 rows vao `wearable_continuous`;
- duplicate insert latency voi `ON CONFLICT DO NOTHING`;
- latest cache upsert latency;
- chart window query latency;
- rows/sec cho batch insert.

Ket qua JSON luu trong:

```text
backend/database/benchmarks/results/
```

## 5. DB-level monitoring

Dung dashboard cua Supabase/TigerData de xem:

- query duration;
- active connections;
- CPU/memory/storage;
- slow queries;
- failed statements.

Neu extension `pg_stat_statements` co san, co the xem query nang nhat bang:

```sql
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

Ten cot co the khac theo version/config Postgres, nen query nay la template de dieu chinh khi chay that.
