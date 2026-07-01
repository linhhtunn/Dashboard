# Database Review Checklist

Dung checklist nay truoc khi viet migration that.

## Business model

- [ ] Patient, clinical staff, staff shift, device, sensor, alert da du entity chinh.
- [ ] Bac si/y ta xem alert theo ca truc qua `staff_shifts`, khong phai gan cung staff voi tung patient.
- [ ] Alert co status workflow ro rang.
- [ ] Review cua bac si co chong duplicate neu can.

## Sensor model

- [ ] Co `device_sensors` de them nhieu loai sensor.
- [ ] Sensor data co `patient_id`, `device_id`, `message_id`.
- [ ] Khong require `sensor_id` tu simulator payload v2.
- [ ] Raw payload khong bi mat.
- [ ] Unique key/idempotency khong qua yeu; hypertable unique index co cot time, vi du `(time, message_id)`.
- [ ] Latest value co cach query nhanh.
- [ ] `latest_sensor_values` la normal table/cache, khong phai hypertable.
- [ ] Continuous 1 Hz nam trong `wearable_continuous`, khong tron steps/stress/BP/SpO2/battery.
- [ ] 60s steps/stress/PPI gom vao `wearable_intervals` va co `interval_seconds`.
- [ ] `wearable_intervals` co ca `window_start` va `window_end`.
- [ ] BP/SpO2/battery gom vao `wearable_measurements`.
- [ ] Triggered BP/SpO2/ECG co `event_type` va `trigger_type` neu simulator emit.
- [ ] Motion batch giu `motion_points`; magnitude la derived feature.
- [ ] Sleep giu 2 bang neu dashboard can timeline; neu MVP rat gon thi chi giu `sleep_sessions.detail`.
- [ ] Sleep session co `end_time`; sleep stage co `stage_id`, `device_id`, va check `start_time < end_time`.
- [ ] Supabase `scenario_ground_truth` la source of truth duy nhat cho ground truth trong MVP.

## Production readiness

- [ ] Co migration SQL.
- [ ] Co seed data.
- [ ] Co env config khong chua secret that.
- [ ] Co Pydantic/TypeScript schema.
- [ ] Co repository layer.
- [ ] Co CI/CD migration step.
- [ ] Co retention/archive policy cho raw data.
- [ ] Da phan loai bang nao la hypertable, bang nao la normal table.
- [ ] Da them index `(patient_id, time DESC)`, `(device_id, time DESC)`, va unique idempotency can thiet.

## Open questions

- [ ] Dung `text` id theo simulator hien tai hay migrate sang `uuid`?
- [ ] Raw data can giu bao lau trong DB?
- [ ] Co can archive raw payload sang object storage khong?
- [ ] Dashboard doc TigerData truc tiep hay qua backend API?
- [ ] Supabase RLS policy theo staff/shift/patient se viet nhu the nao?
- [ ] Code simulator/ingestion da sync voi contract v2 chua?
