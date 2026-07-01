# Realtime E2E Demo Guide

Guide nay dung de demo luong:

```text
Frontend /metrics
-> Realtime simulator API
-> RabbitMQ health.events
-> Team 2 ingestion + Timescale
-> Team 3 realtime anomaly
-> alerts.created + Supabase public.alerts
-> Grafana Dashboard A/B/C
```

## Muc Tieu Demo

- Tren tab `/metrics`, tao run moi, nhin duoc signal thay doi theo activity/abnormal.
- Khi bat `Publish RabbitMQ`, message vao dung queue `q.team2.*`.
- Team 2 consume, normalize, ghi Timescale/TigerData.
- Team 3 detect tren RAM state va tao alert khi abnormal du du lieu.
- Alert duoc publish `alerts.created` va, neu bat persist, insert vao Supabase `public.alerts`.
- Dashboard A hien functional data theo `run_id` va `patient_id`.
- Dashboard B hien latency/throughput va queue depth.
- Dashboard C, neu chay Team 4 probe/subscriber, hien Team 4 receive latency.

## Chuan Bi Truoc Demo

Dung moi run moi cho moi lan demo de tranh cooldown va data cu.

Checklist:

- RabbitMQ queue cu da duoc purge neu dang co backlog lon.
- Team 2+3 consumer dang chay va moi queue `q.team2.*` co consumer dung.
- `backend/database/config/.env` co `TIMESCALE_DB_URL`, `RABBITMQ_URL`, va neu can alert DB thi co `SUPABASE_DB_URL`.
- `backend/observability/.env` co config Grafana/TigerData/Supabase cho dashboard.
- Grafana time range de `Last 1 hour`, refresh `5s`.
- Dashboard A chon dung `run_id`, nhap dung `patient_id`.

Khong xoa queue/exchange tren RabbitMQ. Chi purge message neu can lam sach demo.

## Terminal Chay Demo

### 1. Team 2+3 Consumer

PowerShell:

```powershell
cd C:\Users\ADMIN\software-engineering\backend
$env:OBSERVABILITY_PROMETHEUS_PORT="9108"
$env:INGESTION_REALTIME_ANOMALY="1"
$env:INGESTION_ALERT_PUBLISH="1"
$env:INGESTION_ALERT_PERSIST="1"
python -m ingestion consume --batch-size 25
```

Git Bash:

```bash
cd /c/Users/ADMIN/software-engineering/backend
export OBSERVABILITY_PROMETHEUS_PORT=9108
export INGESTION_REALTIME_ANOMALY=1
export INGESTION_ALERT_PUBLISH=1
export INGESTION_ALERT_PERSIST=1
python -m ingestion consume --batch-size 25
```

Neu Supabase chua chac on, co the demo queue alert truoc:

```bash
export INGESTION_ALERT_PERSIST=0
```

`--batch-size` la so record buffer truoc khi flush/ACK nhanh trong burst. Gia tri nho giam do tre demo nhung tang so lan ghi DB. Gia tri lon tot hon cho throughput nhung co the lam alert/DB hien cham hon.

Goi y:

| Muc dich | Speed simulator | `--batch-size` |
|---|---:|---:|
| Demo chac, it backlog | x1-x5 | 10-25 |
| Demo vua phai | x5-x10 | 25-50 |
| Test throughput | x10-x30 | 100-250 |

Neu queue depth tang lien tuc, Team 2+3 dang cham hon toc do sinh. Giam speed hoac tang batch size de test throughput, nhung voi demo mentor nen uu tien x1-x5.

### 2. Realtime Simulator API

PowerShell:

```powershell
cd C:\Users\ADMIN\software-engineering\backend
$env:SIMULATOR_RABBITMQ_ENV="database/config/.env"
$env:SIMULATOR_PUBLISH_RABBITMQ="false"
uvicorn simulator.realtime.server:app --host 127.0.0.1 --port 8021 --reload
```

Git Bash:

```bash
cd /c/Users/ADMIN/software-engineering/backend
export SIMULATOR_RABBITMQ_ENV=database/config/.env
export SIMULATOR_PUBLISH_RABBITMQ=false
uvicorn simulator.realtime.server:app --host 127.0.0.1 --port 8021 --reload
```

Kiem tra:

```text
http://127.0.0.1:8021/health
```

Mac dinh publish RabbitMQ phai la `false`. Chi bat tren UI khi da san sang.

Khi bam Stop, Reset, hoac tat `Publish RabbitMQ`, simulator se huy cac message con dang cho trong publish queue noi bo. Co the van thay them toi da mot vai message neu chung da vao lenh publish dung luc bam Stop, nhung queue khong duoc tiep tuc flush backlog cu.

Pause khac Stop:

- Pause: giu cung `run_id`, giu history/chart/ground truth, dung tick sinh sample, huy pending publish queue. Resume se chay tiep cung run.
- Stop: ket thuc run de demo lai tu dau. Bam Start sau Stop se reset timeline/history cua run hien tai.
- Doi activity nhu `resting -> standing -> walking` khong can run moi. Doi activity selector khi run dang Running/Pause la du; signal se chuyen dan theo smoothing cua simulator.

De kiem tra backend con run nao dang song/publish:

```text
GET http://127.0.0.1:8021/simulator/runs
```

De dung tat ca run dang duoc backend giu trong RAM:

```text
POST http://127.0.0.1:8021/simulator/runs/stop-all
```

Mac dinh khi tao run moi, backend se stop cac run cu de tranh viec run an van tiep tuc publish len RabbitMQ.

### 3. Frontend

PowerShell:

```powershell
cd C:\Users\ADMIN\software-engineering\frontend
$env:SIMULATOR_API_BASE="http://127.0.0.1:8021"
npm run dev
```

Git Bash:

```bash
cd /c/Users/ADMIN/software-engineering/frontend
export SIMULATOR_API_BASE=http://127.0.0.1:8021
npm run dev
```

Mo:

```text
http://localhost:3000/metrics
```

## Kich Ban Demo Khuyen Nghi

1. Mo `/metrics`.
2. Tao run moi.
3. Copy `run_id` va `patient_id`.
4. Chua bat publish, bam Start de cho UI chay local 5-10s.
5. Bat `Publish RabbitMQ`.
6. Tren RabbitMQ, check queue `q.team2.wearable_continuous`, `q.team2.wearable_motion_batch`, `q.team2.wearable_ppi_batch`, `q.team2.wearable_triggered`.
7. Tren Grafana Dashboard A, chon `run_id`, nhap `patient_id`.
8. Chay normal 20-30s de Dashboard A co HR/RR/SpO2/motion/PPI.
9. Inject abnormal tung case mot. Dung bam lien tuc nhieu abnormal vi abnormal moi se replace abnormal cu.
10. Sau moi alert, tao run moi neu muon test lai cung alert type nhanh, vi Team 3 co cooldown.

Speed nen dung:

- Demo visual: x1 hoac x5.
- Neu can PPI/AFib nhanh hon: x5 la vua.
- Tranh x30 khi dang demo live voi CloudAMQP/TigerData vi co the tao backlog va dashboard tre.

## Duration Cho Tung Abnormal

| Abnormal | Duration nen set | Thoi gian nen cho | Expected |
|---|---:|---:|---|
| `spo2_drop` | 180s | 1-10s | `low_spo2` |
| `fall_event` | 30s | 1-5s neu motion queue sach | `fall_detected` |
| `hypertension_episode` | 600s | 5-15s | BP/vital alert |
| `tachycardia` | 300s | 20-40s | high HR / heart-rate abnormal |
| `bradycardia` | 300s | 20-40s | low HR / heart-rate abnormal |
| `afib_episode` | 300s | 45-90s | `stroke_risk` |
| `stress_episode` | 480s | 30-60s | mainly UI/stress signal, khong phai alert demo chac nhat |

Ly do:

- Motion batch emit moi simulation second, nen fall co spike rat nhanh.
- SpO2 triggered emit lien tuc khi `spo2_drop` active.
- BP triggered emit khoang moi 5s khi BP abnormal active.
- HR/RR co smoothing/window nen tachy/brady can vai chuc giay.
- PPI batch chi emit moi 15 simulation seconds; AFib can nhieu PPI window, 10s la khong du.
- Stress/steps summary can window dai hon, thuong 60s moi ro.

Realtime backend se clamp duration toi thieu theo loai abnormal dua tren `ABNORMALITY_RULES` cua simulator goc de tranh case ground truth qua ngan nhung detector khong du window. Vi du `fall_event` toi thieu 30s; neu nhap 2s, backend se nang len 30s.

Cooldown Team 3 co the chan alert lap lai:

| Alert | Cooldown gan dung |
|---|---:|
| `fall_detected` | 30s |
| `stroke_risk` | 60s |
| heart-rate abnormal | 150s |
| low SpO2 / BP / vital early warning | 600s |

Neu vua test `low_spo2` xong ma bam lai cung patient, co the khong co alert moi trong 10 phut. Tao run moi la cach sach nhat.

## Toc Do Sinh Vs Toc Do Consume

Realtime simulator sinh theo moi simulation second:

- `wearable.continuous`: 1 msg/sim-second.
- `wearable.motion_batch`: 1 msg/sim-second, moi message co 10 motion points.
- `wearable.ppi_batch`: 1 msg moi 15 sim-seconds.
- `wearable.steps_event` va `wearable.stress`: 1 msg moi 60 sim-seconds.
- `wearable.bp_triggered`/`wearable.spo2_triggered`: binh thuong it emit; khi abnormal co the emit day hon.

Uoc tinh toc do publish:

| Speed | Continuous + motion toi thieu |
|---:|---:|
| x1 | khoang 2 msg/s |
| x5 | khoang 10 msg/s |
| x10 | khoang 20 msg/s |
| x30 | khoang 60 msg/s |

Team 2+3 hien tai consume nhieu queue bang nhieu thread, nhung moi physical queue van chi co mot consumer thread trong process. Motion batch nang hon vi phai expand/ghi JSONB/feed fall detector. Neu `q.team2.wearable_motion_batch` hoac `q.team2.wearable_continuous` depth tang lien tuc, nghia la consumer cham hon producer.

Xu ly khi consumer cham:

1. Giam simulator speed ve x1-x5.
2. Purge backlog cu truoc khi tao run moi.
3. Chay consumer voi `--batch-size 25` hoac `50` cho demo; dung `100-250` neu test throughput.
4. Dam bao chi co mot consumer demo dang consume cac queue can thiet, tranh consumer cu bi treo.
5. Neu Dashboard B cho Timescale insert p95/p99 cao hon normalize/Team3 nhieu, bottleneck dang la DB insert/network toi TigerData.

Trong anh Dashboard B hien tai:

- Team2 normalize p95/p99 rat nho, khoang duoi 1ms: normalize khong phai bottleneck.
- Team3 process sample co spike nhung van khoang vai ms den chuc ms: detector khong phai bottleneck chinh.
- Timescale insert latency khoang 250-500ms: day la phan nang hon, co the lam consume kem hon toc do sinh neu speed cao.
- Supabase Alert Write va End-to-End Pipeline Latency `No data` thuong la vi chua co alert, alert persist dang tat/loi, hoac Dashboard dang filter sai `run_id`.

## Check Thoi Gian Co Khop Khong

He thong dung UTC ISO `Z` trong payload va DB:

- Simulator tao `timestamp`, `window_start`, `window_end`, `context.source_event_time`.
- Team 2 ghi `rabbit_received_at` va `normalized_at` bang UTC.
- Observability ghi `perf_trace_events.event_time` bang UTC.
- Grafana hien theo timezone dashboard/browser. Neu browser o Viet Nam, gio hien tren truc co the la UTC+7, nhung query van dung neu time range la `Last 1 hour`.

Can check cac moc:

| Moc | Noi nam |
|---|---|
| Sensor event time | payload `timestamp` / `window_start` |
| Abnormal start | payload `context.abnormal_event_time` va ground truth |
| Team1 publish | `perf_trace_events`, component `team1`, stage `team1_published` |
| Team2 receive | `perf_trace_events`, component `team2`, stage `rabbit_received` |
| Team2 normalize | `perf_trace_events`, component `team2`, stage `normalized` |
| Team3 process | `perf_trace_events`, component `team3`, stage `processed` hoac `process_sample` |
| Alert publish | `perf_trace_events`, component `team3`, stage `alert_published` |
| Alert insert | `perf_trace_events`, component `team3`, stage `alert_inserted` |
| Team4 receive | `perf_trace_events`, component `team4`, stage `team4%received` |

Neu Dashboard A/B khong hien:

1. Kiem tra `run_id` dung chua.
2. Kiem tra `patient_id` dung chua. Dashboard A vitals filter theo `patient_id`, alert panels filter theo `run_id`.
3. Kiem tra time range la `Last 1 hour`.
4. Kiem tra queue co backlog khong.
5. Kiem tra consumer co log consume queue va khong bi reconnect loop.

Debug nhanh bang script:

PowerShell:

```powershell
cd C:\Users\ADMIN\software-engineering
$env:CHECK_RUN_ID="paste-run-id"
$env:CHECK_PATIENT_ID="paste-patient-id"
C:\Users\ADMIN\.conda\envs\day9\python.exe backend\observability\scripts\check_dashboard_a_data.py
```

Git Bash:

```bash
cd /c/Users/ADMIN/software-engineering
export CHECK_RUN_ID=paste-run-id
export CHECK_PATIENT_ID=paste-patient-id
/c/Users/ADMIN/.conda/envs/day9/python.exe backend/observability/scripts/check_dashboard_a_data.py
```

Ket qua can thay:

- `wearable_continuous` co rows cho `patient_id`.
- `motion_batches`, `ppi_patches`, `wearable_measurements` co rows tuy stream.
- `perf_trace_events` co `team2:rabbit_received`, `team2:normalized`, va neu bat Team3 thi co `team3:processed`/`team3:process_sample`.
- Khi bat publish RabbitMQ, `perf_trace_events` co `team1:team1_published`.
- Neu co alert thi Supabase `public.alerts` co row theo `run_id` hoac `patient_id`.

## Dashboard A

Dung de show functional health:

- HR/RR by patient: lay tu Timescale `wearable_continuous`, filter theo `patient_id`.
- SpO2/BP: lay tu triggered/measurement tables, filter theo `patient_id`.
- Motion/PPI: lay tu `motion_batches`/`ppi_patches`.
- Alert timeline/table: lay tu Supabase `public.alerts`, filter theo `run_id`.

Neu SpO2 co data ma HR/RR khong co, thuong la `q.team2.wearable_continuous` dang backlog hoac consumer continuous khong active.

## Dashboard B

Dung de show performance:

- Team2 normalize latency: chi phi validate/normalize, thuong phai rat nho.
- Timescale insert latency: chi phi ghi TigerData, thuong cao hon normalize.
- Team3 process sample latency: chi phi detector realtime.
- Queue depth/consumer panels: xem producer co nhanh hon consumer khong.
- End-to-end pipeline latency: can co ca `team1_published` va `team3 processed`; neu khong co trace stage tu Team1 hoac chua co processed event thi panel trong.
- Supabase Alert Write latency: chi co data khi co alert va `INGESTION_ALERT_PERSIST=1`.

Neu Dashboard B trong mot so panel:

- Chua co alert: alert write/end-to-end alert panels se trong.
- Chua bat observability/tracing: `perf_trace_events` thieu rows.
- Grafana Cloud chua co Prometheus remote_write: Prometheus panels co the trong, nhung SQL panels van chay.

## RabbitMQ Clean Demo

Truoc khi demo, neu co backlog cu:

- Purge `q.team2.wearable_continuous`.
- Purge `q.team2.wearable_motion_batch`.
- Purge `q.team2.wearable_ppi_batch`.
- Purge `q.team2.wearable_triggered`.
- Optional purge `q.alerts.created`, `q.dead_letter`, `q.team1.data_fault`.

Sau do restart Team2+3 consumer va tao run moi.

Khong purge khi dang can chung minh consumer xu ly backlog. Chi purge de demo sach.

## Kich Ban Show Mentor 10-15 Phut

1. Show architecture nhanh: tab `/metrics` la Team1 realtime simulator, RabbitMQ la shared bus, Team2+3 consumer ghi DB va detect.
2. Create run, copy `run_id`/`patient_id`.
3. Start local, show chart/panels thay doi.
4. Chon mode `Existing`, chon patient co san trong Team4/Supabase roster, roi bat Publish RabbitMQ.
5. Show RabbitMQ message rate/queue co data.
6. Show Dashboard A co HR/RR/SpO2/motion/PPI.
7. Inject `spo2_drop` 180s, show SpO2 giam va ground truth active.
8. Cho Team3 tao alert, show `q.alerts.created` hoac Supabase alert table.
9. Show Dashboard B: normalize nhanh, insert DB la phan nang, Team3 process latency.
10. Inject `fall_event` 30s, show motion spike va alert neu queue sach.
11. Neu con thoi gian, inject `afib_episode` 300s va giai thich can du PPI windows nen cham hon.

## Ket Luan Demo

MVP hien tai phu hop demo x1-x5:

- Luong realtime that da noi RabbitMQ -> Timescale -> Team3 -> alert.
- Latency detect noi bo Team3 nho.
- Bottleneck chinh khi speed cao la CloudAMQP/TigerData/network va batch insert.
- De scale that can partition theo `patient_id`, state store/Redis cho rolling window, va tach alert persistence thanh async worker/outbox.
