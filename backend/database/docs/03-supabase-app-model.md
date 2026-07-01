# Supabase App Model

Supabase giu app data va workflow chinh thuc. Day la source of truth cho patient, clinical staff, duty shift, device, alert, review.

## `patients`

| Field | Type | Note |
| --- | --- | --- |
| `patient_id` | text/uuid | PK |
| `mimic_subject_id` | bigint | id tham chieu MIMIC neu Team 1 simulate tu MIMIC |
| `name` | text | ten benh nhan theo payload Team 1 |
| `age` | int | MVP co the dung age; production nen dung `date_of_birth` |
| `height_cm` | double precision | chieu cao tu simulator patient_info |
| `weight_kg` | double precision | can nang de hien thi/profile va rule sau nay |
| `gender` | text | nen co check constraint |
| `age_group` | text | young/adult/elderly/etc tu simulator |
| `pregnancy_status` | text | none/pregnant/postpartum/unknown |
| `lifestyle` | text | sedentary/moderately_active/etc |
| `risk_factors` | text[] | danh sach risk factor nhu heart_disease_risk |
| `activity_level` | text | low/medium/high |
| `medical_history` | text | tom tat benh su |
| `health_status` | text | NORMAL/WARNING/CRITICAL/UNKNOWN |
| `baseline_signals` | jsonb | baseline HR/RR/PPI/stress/BP/SpO2/ECG rhythm |
| `status` | text | active/inactive |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | update khi sua profile |

Giu `baseline_signals` dang `jsonb` vi day la baseline snapshot cua patient. Lab duoc tach sang `patient_lab_results` de query/filter theo tung chi so.

## `patient_lab_results`

| Field | Type | Note |
| --- | --- | --- |
| `lab_result_id` | text/uuid | PK |
| `patient_id` | text/uuid | FK `patients` |
| `sampled_at` | date | ngay lay mau |
| `panel_type` | text | chemistry/hematology/coagulation/other |
| `test_name` | text | glucose/creatinine/hemoglobin/etc |
| `value_numeric` | double precision | gia tri so, nullable neu categorical |
| `value_text` | text | gia tri text, nullable |
| `unit` | text | mg/dL, mEq/L, g/dL, etc |
| `reference_range` | text | optional |
| `abnormal_flag` | text | low/high/critical_low/critical_high/normal |
| `source` | text | simulator/manual/import/etc |
| `created_at` | timestamptz | default now |

Unique de xuat: `(patient_id, sampled_at, panel_type, test_name)`.

## `clinical_staff`

| Field | Type | Note |
| --- | --- | --- |
| `staff_id` | text/uuid | PK |
| `user_id` | uuid | FK toi Supabase `auth.users(id)` neu dung auth |
| `full_name` | text | ten bac si/y ta |
| `email` | text | co the lay tu auth |
| `department` | text | khoa/phong |
| `role` | text | doctor/nurse/admin |
| `status` | text | active/inactive |
| `created_at` | timestamptz | default now |

## `staff_shifts`

Bang nay model workflow "ai dang truc thi xem alert/benh nhan", thay vi gan cung staff voi tung patient.

| Field | Type | Note |
| --- | --- | --- |
| `shift_id` | text/uuid | PK |
| `staff_id` | text/uuid | FK `clinical_staff` |
| `department` | text | khoa/phong truc |
| `shift_role` | text | primary/backup/on_call |
| `shift_start` | timestamptz | bat dau ca truc |
| `shift_end` | timestamptz | ket thuc ca truc |
| `status` | text | scheduled/active/completed/cancelled |
| `created_at` | timestamptz | default now |

Query dashboard co the loc staff dang truc bang `now() between shift_start and shift_end` va `status = active/scheduled`.

## `devices`

| Field | Type | Note |
| --- | --- | --- |
| `device_id` | text/uuid | PK |
| `patient_id` | text/uuid | FK `patients` |
| `device_type` | text | smartwatch/band/simulator |
| `vendor` | text | nha cung cap |
| `model` | text | model thiet bi |
| `external_device_key` | text | vi du `SIM_WATCH_P005` tu simulator |
| `status` | text | active/inactive/retired |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | update khi doi owner/status |

## `device_sensors`

| Field | Type | Note |
| --- | --- | --- |
| `sensor_id` | text/uuid | PK |
| `device_id` | text/uuid | FK `devices` |
| `sensor_type` | text | heart_rate/spo2/rr/stress/etc |
| `label` | text | ten hien thi |
| `unit` | text | bpm/%/breaths_per_min/etc |
| `stream_name` | text | wearable_continuous/wearable_stress/etc |
| `sampling_mode` | text | continuous/windowed/triggered/batch/daily |
| `config` | jsonb | calibration, sampling rate, vendor metadata |
| `active` | boolean | default true |
| `created_at` | timestamptz | default now |

Simulator output hien tai chua co `sensor_id`. Backend co the map `(device_id, stream_name, metric)` sang `device_sensors.sensor_id` khi can.

## `alerts`

| Field | Type | Note |
| --- | --- | --- |
| `alert_id` | text/uuid | PK |
| `patient_id` | text/uuid | FK `patients` |
| `device_id` | text/uuid | FK `devices`, nullable |
| `sensor_id` | text/uuid | FK `device_sensors`, nullable |
| `scenario_id` | text | nullable |
| `source_event_id` | text | message/source event tao alert |
| `dedup_key` | text | chong duplicate alert |
| `alert_type` | text | low_spo2/fall/stress_spike/etc |
| `severity` | text | low/medium/high/critical |
| `alert_time` | timestamptz | luc abnormal xay ra |
| `status` | text | new/viewed/reviewed/resolved/dismissed |
| `shift_id` | text/uuid | FK `staff_shifts`, nullable |
| `claimed_by_staff_id` | text/uuid | FK `clinical_staff`, nullable |
| `reason` | text | giai thich ngan |
| `confidence` | double precision | 0..1 |
| `features` | jsonb | feature snapshot |
| `model_version` | text | version AI/model |
| `rule_version` | text | version rule |
| `source` | text | team3_anomaly/rule_engine/etc |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | update status |
| `resolved_at` | timestamptz | nullable |

## `alert_context`

| Field | Type | Note |
| --- | --- | --- |
| `alert_id` | text/uuid | PK, FK `alerts` |
| `patient_id` | text/uuid | FK `patients` |
| `window_start` | timestamptz | start chart window |
| `window_end` | timestamptz | end chart window |
| `summary` | jsonb | min/max/avg quanh alert |
| `chart_query_params` | jsonb | param de backend query TigerData |
| `created_at` | timestamptz | default now |

## `alert_reviews`

| Field | Type | Note |
| --- | --- | --- |
| `review_id` | text/uuid | PK |
| `alert_id` | text/uuid | FK `alerts` |
| `staff_id` | text/uuid | FK `clinical_staff` |
| `review_status` | text | confirmed/false_alarm/uncertain |
| `note` | text | ghi chu |
| `reviewed_at` | timestamptz | default now |

Unique de xuat: `(alert_id, staff_id)` neu moi staff chi review 1 lan.

## `scenario_definitions`

| Field | Type | Note |
| --- | --- | --- |
| `scenario_id` | text | PK |
| `scenario_type` | text | fall/low_spo2/stress_spike/etc |
| `description` | text | mo ta |
| `expected_signals` | jsonb | tin hieu ky vong |
| `created_at` | timestamptz | default now |

## `scenario_ground_truth`

| Field | Type | Note |
| --- | --- | --- |
| `episode_id` | text/uuid | PK |
| `patient_id` | text/uuid | FK `patients` |
| `device_id` | text/uuid | FK `devices`, nullable |
| `episode_type` | text | hypertension_episode/spo2_drop/fall_event/etc |
| `start_time` | timestamptz | episode start |
| `end_time` | timestamptz | episode end |
| `duration_seconds` | int | duration |
| `duration_minutes` | double precision | duration |
| `peak_heart_rate` | int | max HR in episode |
| `min_heart_rate` | int | min HR in episode |
| `systolic_bp_delta_min/max` | int | expected BP effect range |
| `diastolic_bp_delta_min/max` | int | expected BP effect range |
| `spo2_delta_min/max` | double precision | expected SpO2 effect range |
| `severity` | text | low/medium/high/critical |
| `status` | text | abnormal by default |
| `created_at` | timestamptz | default now |

Bang nay la ground truth duy nhat cho abnormal labels trong MVP. Runtime sensor payload khong duoc dung field label `status` de detect.

## `wearable_fault_log`

| Field | Type | Note |
| --- | --- | --- |
| `fault_id` | bigserial | PK |
| `patient_id` | text/uuid | FK `patients` |
| `device_id` | text/uuid | FK `devices`, nullable |
| `stream_name` | text | stream bi inject fault |
| `fault_type` | text | invalid_ppi_intervals/invalid_motion_value/etc |
| `source_message_id` | text | message id goc |
| `detail` | text | mo ta fault |
| `occurred_at` | timestamptz | thoi diem fault |
| `created_at` | timestamptz | default now |

## `notifications`

| Field | Type | Note |
| --- | --- | --- |
| `notification_id` | text/uuid | PK |
| `alert_id` | text/uuid | FK `alerts` |
| `channel` | text | email/sms/push/in_app |
| `recipient_type` | text | staff/patient/admin |
| `recipient_id` | text/uuid | id nguoi nhan |
| `status` | text | pending/sent/failed |
| `sent_at` | timestamptz | nullable |
| `error_message` | text | nullable |
| `created_at` | timestamptz | default now |

## `event_audit_logs`

| Field | Type | Note |
| --- | --- | --- |
| `id` | bigserial | PK |
| `event_id` | text | message/event id |
| `event_type` | text | wearable_continuous/alerts.created/etc |
| `alert_id` | text/uuid | nullable |
| `patient_id` | text/uuid | nullable |
| `service_name` | text | consumer/service xu ly |
| `status` | text | processed/failed/skipped |
| `message` | text | mo ta ngan |
| `error_detail` | text | nullable |
| `created_at` | timestamptz | default now |
