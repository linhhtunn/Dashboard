# Backend Database Workspace

Thu muc nay chua thiet ke database, migration SQL va scaffold can thiet cho backend.

Trang thai hien tai: **migration/code scaffold ready for review**. Chua apply len Supabase/TigerData trong repo.

## Cau truc

- `docs/`: tai lieu data modeling da tach nho theo doi tuong doc.
- `migrations/`: noi dat SQL migration sau khi schema duoc confirm.
- `seeds/`: du lieu mau cho dev/test.
- `clients/`: code ket noi Supabase/TigerData sau nay.
- `schemas/`: Pydantic/TypeScript schema validate du lieu.
- `repositories/`: ham insert/query/update DB.
- `config/`: bien moi truong va config DB.
- `ci/`: script/chuan CI/CD migration truoc deploy.
- `benchmarks/`: script va JSON result do insert/upsert/query performance.

## Cach review

Doc theo thu tu:

1. `docs/00-overview.md`
2. `docs/01-team-responsibilities.md`
3. `docs/03-supabase-app-model.md`
4. `docs/04-timescale-sensor-model.md`
5. `docs/diagrams/`

Simulator source of truth hien tai:

- `../simulator/core/docs/wearable_simulator_expected_output.md`

## Lenh hay dung

Chay tu thu muc `backend/`.

Kiem tra schema sau khi da apply migration:

```bash
python database/ci/verify_schema.py --database supabase
python database/ci/verify_schema.py --database tigerdata
```

Apply migration theo thu tu file SQL:

```bash
python database/ci/apply_migrations.py --database supabase --yes
python database/ci/apply_migrations.py --database tigerdata --yes
```

Smoke test insert/upsert sau khi da apply:

```bash
python database/ci/smoke_test.py --database supabase --yes
python database/ci/smoke_test.py --database tigerdata --yes
```

Benchmark Timescale insert/upsert/query:

```bash
python database/benchmarks/run_timescale_benchmark.py --yes
```

Can cau hinh `SUPABASE_DB_URL` va/hoac `TIMESCALE_DB_URL` trong `backend/.env` hoac `backend/database/config/.env`.
