# CI/CD Migration

Noi nay chua script kiem tra migration va database truoc deploy.

- `apply_migrations.py`: apply cac file SQL trong `migrations/supabase` hoac `migrations/tigerdata` theo thu tu filename. Bat buoc `--yes`.
- `verify_schema.py`: kiem tra bang/cot/index va hypertable sau khi apply.
- `smoke_test.py`: insert/upsert test data toi thieu sau khi apply. Bat buoc `--yes`.

Chay tu thu muc `backend/`:

```bash
python database/ci/verify_schema.py --database supabase
python database/ci/verify_schema.py --database tigerdata
python database/ci/smoke_test.py --database tigerdata --yes
```
