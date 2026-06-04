# Team 2 — Data Ingestion (Sprint 1)

Luồng: **Simulator (Team 1) → RabbitMQ → Team 2 → Supabase → Team 3**

Contract: [project_data_contracts.md](project_data_contracts.md) · Task: [sprint_1_task_allocation.md](sprint_1_task_allocation.md) §2.2

## Đã làm gì

| Module | File |
|--------|------|
| Validate + clean | [backend/ingestion/cleaner.py](../backend/ingestion/cleaner.py) |
| Ghi DB | [backend/ingestion/db_connector.py](../backend/ingestion/db_connector.py) |
| Đọc queue | [backend/ingestion/consumer.py](../backend/ingestion/consumer.py) |
| Pipeline | [backend/ingestion/pipeline.py](../backend/ingestion/pipeline.py) |
| Schema / contract | [backend/contracts/sensor_data.py](../backend/contracts/sensor_data.py) |
| Cấu hình (env) | [backend/settings.py](../backend/settings.py) |

Mặc định RabbitMQ / bảng DB / mock — override qua `.env` (xem `.env.example`).


## Hướng dẫn chạy

Chạy trong `backend/`, có file `.env` (mẫu [.env.example](../backend/.env.example)).

**Cài đặt**

```bash
cd backend && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
pytest -q
```

**Biến quan trọng:** `DATABASE_URL` (password Database, `@` → `%40`), `RABBITMQ_URL`.
**E2E (khuyến nghị với Team 1)**

```bash
# Terminal A — declare topology + publish (từ repo root hoặc PYTHONPATH=.)
python -m rabbit_mq.replay_generated_data --declare-only
python -m rabbit_mq.replay_generated_data --vitals backend/simulator/output/generated_vitals_P001_2h.jsonl --limit 50

# Terminal B — Team 2 consumer (không chạy song song rabbit_mq/mock_team2_worker)
cd backend
python -m ingestion health
python -m ingestion consume
```

**Test nhanh không simulator:** `python -m ingestion file` · `python -m ingestion.mock_producer --count 10`

**Lệnh khác:** `python scripts/inspect_database.py` (kiểm tra schema)

**JSON queue (Team 1 simulator)** — `message_id`, `patient_id`, `timestamp`, `signals` với `hrv_rmssd`, `rr_interval_ms`, `acc_magnitude`, `gyro_magnitude` (vẫn hỗ trợ alias `hrv`). `context.scenario_id` → `raw_payload._ingestion.scenario_id`.


**Đọc DB (Python)**

```python
from settings import load_database_url
from ingestion.db_connector import DatabaseConnector

db = DatabaseConnector(load_database_url())
rows = db.fetch_valid_clean_vitals("P001", limit=50)
raw = db.fetch_raw_vitals("P001", data_state="INVALID", limit=20)
```

**Kiểm tra nhanh**

```sql
SELECT COUNT(*) FROM raw_vitals;
SELECT COUNT(*) FROM clean_vitals;
```

**Lỗi thường gặp:** direct host `db.*` → dùng pooler; sai password → Database password; FK → dùng `P001`–`P010`.
