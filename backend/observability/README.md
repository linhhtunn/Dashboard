# Realtime Observability

This folder contains the Grafana Cloud monitoring layer for the Team 1 -> Team 2+3 -> Team 4 flow.

## What Runs Where

- Python runtime exposes Prometheus-format worker metrics on port `9108`.
- Docker Alloy scrapes that worker endpoint and remote-writes metrics to Grafana Cloud Prometheus.
- Grafana dashboards run in Grafana Cloud, not in a local Grafana container.
- Timescale stores durable run traces in `test_runs`, `test_run_steps`, `perf_trace_events`, `perf_queue_samples`, and `evaluation_results`.

## Start Cloud Metrics Forwarding

From `backend/observability`:

```bash
docker compose --env-file .env up -d
```

This starts only Grafana Alloy. Alloy forwards Dashboard B metrics to Grafana Cloud.

## Grafana Cloud Setup

Use Grafana Cloud as the only dashboard layer:

1. In Grafana Cloud, create PostgreSQL datasources for TigerData/TimescaleDB and Supabase.
2. In Grafana Cloud, use the built-in hosted Prometheus datasource for Dashboard B.
3. Fill these Alloy remote-write values in `backend/observability/.env`:

```env
GRAFANA_CLOUD_URL=https://<your-stack>.grafana.net
GCLOUD_HOSTED_METRICS_URL=https://prometheus-prod-xx.grafana.net/api/prom/push
GCLOUD_HOSTED_METRICS_ID=
GCLOUD_RW_API_KEY=
METRICS_SCRAPE_TARGET=host.docker.internal:9108
```

In Grafana Cloud, add PostgreSQL datasources for TigerData and Supabase, then import the dashboard JSON files from `grafana/dashboards`.

See **`docs/grafana_postgres_datasources.md`** for step-by-step datasource setup and sample SQL.

Quick setup from `backend/`:

```bash
bash observability/scripts/update_env_from_db_urls.sh
.venv/bin/python observability/scripts/test_grafana_db_connections.py
```

The backend uses cloud connection strings:

- `SUPABASE_DB_URL`
- `TIMESCALE_DB_URL`
- `RABBITMQ_URL`

Grafana datasources need split database fields, so also fill these in `.env`:

- `TIMESCALE_HOST`, `TIMESCALE_PORT`, `TIMESCALE_DB`, `TIMESCALE_USER`, `TIMESCALE_PASSWORD`, `TIMESCALE_SSLMODE`
- `SUPABASE_HOST`, `SUPABASE_PORT`, `SUPABASE_DB`, `SUPABASE_USER`, `SUPABASE_PASSWORD`, `SUPABASE_SSLMODE`

For Supabase, `SUPABASE_HOST` is usually `db.<project-ref>.supabase.co`. For TigerData, use the host/user/db/password from the TigerData connection details.

## Start The Consumer For Cloud Metrics

From `backend`, start the Team 2/3 worker. Metrics are enabled by default, so
Alloy can forward them to Grafana Cloud:

```bash
python -m ingestion consume --batch-size 25
```

This starts the normal RabbitMQ consumer and exposes the scrape endpoint:

```text
http://localhost:9108/metrics
```

Dashboard B uses metrics such as `health_realtime_messages_total`,
`health_realtime_db_rows_total`, `health_realtime_stage_latency_ms`,
`health_realtime_db_insert_latency_ms`, `health_realtime_errors_total`, and
`health_realtime_queue_depth`. The consumer samples RabbitMQ queue depth every
second by default; change it with `--queue-sample-interval 2`.

You usually do not need to pass a metrics port. Use `--prometheus-port 9200`
only if port `9108` is busy.

Alloy scrapes `host.docker.internal:9108` and remote-writes to Grafana Cloud.
Use the Grafana Cloud hosted Prometheus datasource for Dashboard B.

## Run An Evaluation

From `backend`:

```powershell
python -m observability.run_realtime_evaluation --profile smoke --patient-id P005 --limit 120 --target-msg-sec 5 --team4-path rabbitmq --no-declare
```

Run multiple patients:

```powershell
python -m observability.run_realtime_evaluation --run-id load_10p_10m --profile load_baseline --patient-ids P001 P002 P003 P004 P005 P006 P007 P008 P009 P010 --concurrency 10 --duration-seconds 600 --limit 100000 --target-msg-sec 50 --team4-path rabbitmq --no-declare
```

Open the Streamlit control panel if installed:

```powershell
streamlit run observability/dashboard_streamlit.py
```

Streamlit is only the local control panel for launching runs and checking env readiness. Grafana/Grafana Cloud is the dashboard layer for mentor reporting and long-running observation.

## Key Files

- `docs/realtime_success_metrics.md`: success criteria and how to interpret results.
- `docs/real_flow_evaluation.md`: how to evaluate the real flow and load ladder.
- `docs/grafana_cloud_setup.md`: Grafana Cloud datasource mapping and remote_write setup.
- `docs/grafana_alloy_setup.md`: Grafana Alloy setup for sending worker metrics to Grafana Cloud without hosting Prometheus.
- `evaluation.env.example`: local paths, endpoints, contracts, and load profiles.
- `run_realtime_evaluation.py`: CLI runner for replay/load scenarios.
- `dashboard_streamlit.py`: local control panel for changing volume/frequency and launching runs.
- `team4_probe.py`: mock Team 4 RabbitMQ/Supabase probe that can be replaced by a real frontend subscriber later.
- `alloy/config.local.alloy`: Docker Alloy config for scraping worker metrics and pushing to Grafana Cloud.
- `grafana/dashboards/dashboard_a_functional_health.json`: functional and health dashboard.
- `grafana/dashboards/dashboard_b_performance.json`: throughput and performance dashboard.
- `grafana/dashboards/dashboard_c_team4_realtime.json`: Team 4 realtime dashboard.
