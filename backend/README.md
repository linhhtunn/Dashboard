# Backend — ingestion

Luồng: RabbitMQ `vitals.raw` → validate/clean → Supabase (`raw_vitals` mọi message; `clean_vitals` chỉ `VALID`).

Chi tiết: [docs/team2_ingestion_handoff.md](../docs/team2_ingestion_handoff.md)

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # điền DATABASE_URL, RABBITMQ_URL
```

## Chạy

```bash
pytest -q
python -m ingestion health
python -m ingestion file          # fixture offline → DB
python -m ingestion consume       # consumer (declare RabbitMQ topology trước)
python -m ingestion.mock_producer --count 5
```

E2E với simulator: xem handoff (`replay_generated_data` + `ingestion consume`).
