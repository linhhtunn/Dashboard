# DB Clients

Noi nay chua code tao ket noi DB/event bus.

- `supabase_client.py`: server-side Postgres client cho Supabase app database qua `SUPABASE_DB_URL`.
- `timescale_client.py`: connection pool cho TigerData/TimescaleDB qua `TIMESCALE_DB_URL`.
- `rabbitmq_client.py`: shared RabbitMQ connection helper qua `RABBITMQ_URL`.

Client chi quan ly connection lifecycle. Business logic nam o service layer; SQL operation nam o `../repositories/`.
