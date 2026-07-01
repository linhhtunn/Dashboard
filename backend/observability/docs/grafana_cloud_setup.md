# Grafana Cloud Setup

Use Grafana Cloud when mentor/team needs a shared dashboard URL.

## 1. Import Dashboards

Import these files in Grafana Cloud:

- `backend/observability/grafana/dashboards/dashboard_a_functional_health.json`
- `backend/observability/grafana/dashboards/dashboard_b_performance.json`
- `backend/observability/grafana/dashboards/dashboard_c_team4_realtime.json`

During import, map datasource inputs:

| Dashboard input | Grafana Cloud datasource |
| --- | --- |
| `DS_PROMETHEUS` | Grafana Cloud Prometheus / Metrics |
| `DS_HEALTH_TIMESCALE` | TigerData PostgreSQL datasource |
| `DS_HEALTH_SUPABASE` | Supabase PostgreSQL datasource |

If Grafana does not ask for datasource mapping, delete the previously imported dashboard and import the latest JSON file from this repo again. The dashboard files contain `__inputs`, which is what makes Grafana show the datasource mapping step.

## 2. Get Grafana Cloud URL

Open your Grafana Cloud stack. The browser URL is the value:

```env
GRAFANA_CLOUD_URL=https://<your-stack>.grafana.net
```

Example:

```env
GRAFANA_CLOUD_URL=https://silverterrace1499.grafana.net
```

This value is only used by Streamlit as a quick link.

## 3. Get Prometheus remote_write Credentials

In Grafana Cloud:

1. Open your Grafana Cloud stack.
2. Go to `Connections`.
3. Search for `Prometheus`.
4. Choose `Send Prometheus metrics` / `Hosted Prometheus metrics`.
5. Open the setup instructions or details page.
6. Copy the `remote_write` snippet.

It looks like:

```yaml
remote_write:
  - url: https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
    basic_auth:
      username: "1234567"
      password: "glc_..."
```

Map it into `backend/observability/.env`:

```env
GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-xx-xxx.grafana.net/api/prom/push
GRAFANA_CLOUD_PROMETHEUS_USERNAME=1234567
GRAFANA_CLOUD_PROMETHEUS_PASSWORD=glc_...
PROMETHEUS_CONFIG_FILE=./prometheus/prometheus.cloud.yml
```

## 4. Generate Local Prometheus Cloud Config

After filling the env values:

```powershell
cd C:\Users\ADMIN\software-engineering\backend
powershell -NoProfile -ExecutionPolicy Bypass -File observability\scripts\generate_prometheus_cloud_config.ps1
```

Then restart local Prometheus:

```powershell
cd C:\Users\ADMIN\software-engineering\backend\observability
docker compose --env-file .env up -d
```

Flow:

```text
Team2+3 local :9108/metrics
  -> local Prometheus
  -> remote_write
  -> Grafana Cloud Prometheus
  -> Grafana Cloud dashboard
```
