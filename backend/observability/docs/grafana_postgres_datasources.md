# Grafana Postgres Datasources (Supabase + TimescaleDB)

Dashboards in `grafana/dashboards/` query **two Postgres databases**:

| Datasource label | Database | Typical tables |
| --- | --- | --- |
| **Health Timescale** | TigerData / Timescale | `wearable_continuous`, `perf_trace_events`, `evaluation_results` |
| **Health Supabase** | Supabase Postgres | `public.patients`, `public.alerts`, `public.scenario_ground_truth` |

Grafana connects via the **PostgreSQL plugin** — each panel runs SQL (with `$__timeFilter()` macros).

---

## 1. Generate split connection fields

Grafana provisioning cannot use a single `postgres://...` URL reliably. Split fields live in `backend/observability/.env`.

From `backend/`:

```bash
bash observability/scripts/update_env_from_db_urls.sh
python observability/scripts/test_grafana_db_connections.py
```

This reads `backend/.env` (`TIMESCALE_DB_URL`, `DATABASE_URL`) and fills `TIMESCALE_HOST`, `SUPABASE_HOST`, etc.

**Supabase note:** script prefers **direct** host `db.<project-ref>.supabase.co` instead of pooler — Grafana prepared statements work better on direct connections.

---

## 2. Grafana Cloud — add datasources manually

Open your stack → **Connections** → **Data sources** → **Add data source** → **PostgreSQL**.

### A. Health Timescale (TigerData)

Use values from `observability/.env`:

| Field | Example |
| --- | --- |
| Name | `Health Timescale` |
| Host | `r6uekg175g....tsdb.cloud.timescale.com:33136` |
| Database | `tsdb` |
| User | `tsdbadmin` |
| Password | `TIMESCALE_PASSWORD` |
| TLS/SSL Mode | `require` |
| Version | 16+ |
| TimescaleDB | **enabled** |

**Save & test** → should be green.

### B. Health Supabase

| Field | Example |
| --- | --- |
| Name | `Health Supabase` |
| Host | `db.<project-ref>.supabase.co:5432` |
| Database | `postgres` |
| User | `postgres` |
| Password | Supabase DB password |
| TLS/SSL Mode | `require` |
| TimescaleDB | **disabled** |

If test fails with pooler host, switch to direct `db.*.supabase.co`.

---

## 3. Import dashboards

Import JSON from `observability/grafana/dashboards/`:

- `dashboard_a_functional_health.json`
- `dashboard_b_performance.json`
- `dashboard_c_team4_realtime.json`

When prompted, map:

| Input | Select |
| --- | --- |
| `DS_PROMETHEUS` | Grafana Cloud Prometheus |
| `DS_HEALTH_TIMESCALE` | Health Timescale |
| `DS_HEALTH_SUPABASE` | Health Supabase |

Datasource **names** should match so future re-imports stay consistent.

---

## 4. Verify with sample SQL

**Timescale — heart rate (Explore → Health Timescale):**

```sql
SELECT time, heart_rate AS value
FROM wearable_continuous
WHERE $__timeFilter(time)
  AND patient_id = 'P001'
ORDER BY time;
```

**Timescale — trace by run_id:**

```sql
SELECT component, stage, event_time, duration_ms, message_id
FROM perf_trace_events
WHERE run_id = 'demo_001'
ORDER BY event_time;
```

**Supabase — alerts:**

```sql
SELECT alert_time, alert_id, patient_id, alert_type, severity, status
FROM public.alerts
WHERE $__timeFilter(alert_time)
ORDER BY alert_time DESC
LIMIT 50;
```

---

## 5. Local Grafana (Docker)

If using `docker compose` instead of Grafana Cloud:

```bash
cd backend/observability
bash scripts/update_env_from_db_urls.sh
bash scripts/start_local_stack.sh
```

Datasources are auto-provisioned from `grafana/provisioning/datasources/datasources.yml` using the same `.env` fields.

Open http://localhost:3001 (admin/admin).

---

## 6. Schema ↔ Grafana mapping

| Grafana panel type | SQL shape |
| --- | --- |
| Time series | `SELECT time, <numeric> AS value [, <series> AS metric] ...` |
| Table | any columns |
| Stat | single value column |

Timescale hypertables (`wearable_continuous.time`, `perf_trace_events.time`) work with `$__timeFilter(time)`.

Downsample example:

```sql
SELECT time_bucket('1 minute', time) AS time, avg(heart_rate) AS value
FROM wearable_continuous
WHERE $__timeFilter(time) AND patient_id = 'P001'
GROUP BY 1 ORDER BY 1;
```

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `password authentication failed` | Re-run `update_env_from_db_urls.sh`; check Supabase direct password in project settings |
| `SSL required` | Set TLS mode `require` |
| Dashboard empty, SQL works in Explore | Re-import dashboard and remap datasources |
| `relation does not exist` | Apply migrations (`tigerdata/*`, `supabase/*`) |
| Supabase pooler errors | Use `db.<ref>.supabase.co`, not `pooler.supabase.com` |
