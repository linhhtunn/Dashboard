# Dev Implementation Notes

Day la checklist cho dev backend khi chuyen proposal thanh code.

## Thu muc can co

- `migrations/`: SQL tao bang/index/policy.
- `seeds/`: du lieu mau cho local/dev/test.
- `clients/`: DB connection.
- `schemas/`: Pydantic/TypeScript validation model.
- `repositories/`: ham insert/query/update DB.
- `config/`: env var va connection string.
- `ci/`: script migration truoc deploy.

## Implementation order de an toan

1. Tao Supabase app tables truoc.
2. Tao TigerData hypertables sau.
3. Tao index/unique constraint.
4. Tao seed data nho.
5. Viet repository insert/query.
6. Viet test idempotency cho `message_id`.
7. Chay migration trong CI truoc khi deploy.

## Ten cot nen thong nhat

- Dung `id` cho primary key trong app tables, hoac `patient_id` neu team da chot style cu.
- Dung `time` cho timestamp do sensor.
- Dung `received_at` cho timestamp backend nhan message.
- Dung `ingested_at` cho raw event da ghi vao DB.
- Dung `created_at` / `updated_at` cho audit app DB.
- Tat ca timestamp nen luu UTC.
- Dung `timestamp` trong payload simulator, map sang cot DB `time`.
- Dung `interval_seconds` cho stream 60s neu payload co field nay.
- Dung `window_start` va `window_end` cho interval/batch/feature windows.

## Luu y quan trong

- Unique key trong wearable stream nen uu tien `message_id`, nhung voi Timescale hypertable unique index nen gom cot partition time, vi du `(time, message_id)`.
- `sensor_id` la metadata noi bo; simulator hien tai chua emit field nay.
- Latest value nen co bang cache rieng neu dashboard can realtime nhanh; `latest_sensor_values` la normal table, khong phai hypertable.
- JSONB chi dung cho field linh hoat; field hay filter/query phai tach thanh cot rieng.
- Khong thiet ke DB dua tren field raw da bo: `schema_version`, `message_type`, `quality`, `signal_quality`, `source`, `distance_m`.
- Motion raw moi da co `acc_magnitude` / `gyro_magnitude`; Team 2 chi can validate va luu raw batch.
- `raw_sensor_events` nen partition theo `received_at`; normalized hypertables nen partition theo `time`.
- `health_features` nen co unique `(patient_id, device_id, feature_window, source_window_start, source_window_end)` de feature job rerun khong duplicate.
- Sleep sessions nen co `end_time`; sleep stage intervals nen check `start_time < end_time`.
