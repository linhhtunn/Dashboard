# Database Config

Noi nay chua bien moi truong va cach cau hinh DB cho local/dev/prod.

Khong commit secret that vao repo.

## Bien moi truong

- `SUPABASE_URL`: Supabase API URL.
- `SUPABASE_ANON_KEY`: publishable/anon key neu backend can goi API client.
- `SUPABASE_SERVICE_ROLE_KEY`: chi dung server-side, khong dua ra frontend.
- `SUPABASE_DB_URL`: Postgres connection string cua Supabase app database.
- `TIMESCALE_DB_URL`: TigerData/TimescaleDB connection string.
- `TIMESCALE_DB_PASSWORD`: optional password neu `TIMESCALE_DB_URL` chua nhung password.
- `TIMESCALE_MIN_CONNECTIONS`: pool min connections, default `1`.
- `TIMESCALE_MAX_CONNECTIONS`: pool max connections, default `5`.
- `TIMESCALE_BATCH_SIZE`: batch insert page size, default `500`.
- `RABBITMQ_URL`: CloudAMQP/RabbitMQ URL.
- `DATABASE_BENCHMARK_RESULTS_DIR`: noi luu benchmark JSON.
