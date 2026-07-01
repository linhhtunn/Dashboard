# Migrations

Noi nay chua file SQL tao bang, alter bang, index, constraint, RLS policy.

Chua apply migration that len database cho den khi data model trong `../docs/` duoc confirm.

## Supabase

App/business database. Chay theo thu tu:

- `supabase/0001_extensions_and_helpers.sql`
- `supabase/0002_people_devices.sql`
- `supabase/0003_scenarios.sql`
- `supabase/0004_alerts_workflow.sql`
- `supabase/0005_indexes.sql`

RLS/policy migration de sau, khong chay trong MVP simulate:

- `optional_supabase_rls/0001_enable_rls_and_staff_policies.sql`

## TigerData/TimescaleDB

Time-series database rieng. Chay theo thu tu:

- `tigerdata/0001_extensions.sql`
- `tigerdata/0002_raw_and_continuous.sql`
- `tigerdata/0003_intervals_measurements.sql`
- `tigerdata/0004_batches_sleep_features.sql`
- `tigerdata/0005_hypertables.sql`
- `tigerdata/0006_indexes.sql`
- `tigerdata/0007_drop_measurement_status.sql`
- `tigerdata/0008_rename_health_feature_ppi_rmssd.sql`
- `tigerdata/0009_observability.sql`

`ecg_measurements` va `sleep_stage_intervals` dang la normal table trong MVP vi primary key hien tai khong gom partition time column. Neu sau nay can hypertable, doi sang composite key co `time`/`start_time` truoc.
