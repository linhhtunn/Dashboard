# Repository Layer

Noi nay chua ham thao tac DB, tach khoi service logic.

- `app_repository.py`: upsert patient/device/sensor va tao alert/context trong Supabase.
- `timeseries_repository.py`: batch insert/upsert/query cho TigerData/TimescaleDB.
- `sql_helpers.py`: helper batch insert bang `psycopg2.extras.execute_values`.

Repository khong chua business logic. No chi nhan schema da validate va ghi/doc DB.
