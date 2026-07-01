# Grafana Alloy Setup

Grafana Alloy is the recommended collector when Grafana Cloud is the long-term dashboard and metrics store.

Flow:

```text
Team2+3 worker localhost:9108/metrics
RabbitMQ localhost:15692/metrics, optional
node_exporter localhost:9100/metrics, optional
cAdvisor localhost:8080/metrics, optional
  -> Grafana Alloy
  -> Grafana Cloud Metrics
```

## 1. Choose The Right Grafana Cloud Onboarding Option

In the Prometheus onboarding screen, choose:

```text
Collect and send metrics to a fully-managed Prometheus Stack
```

Use the Alloy install instructions for Windows.

Do not choose `Connect and enhance an existing Prometheus instance` unless you intentionally want to keep a full Prometheus server.

## 2. Store Grafana Cloud Credentials

Fill these in `backend/observability/.env`:

```env
GCLOUD_RW_API_KEY=glc_...
GCLOUD_HOSTED_METRICS_ID=...
GCLOUD_HOSTED_METRICS_URL=https://prometheus-prod-xx.grafana.net/api/prom/push
```

If Grafana Cloud also shows logs/fleet values, you can keep them too:

```env
GCLOUD_HOSTED_LOGS_ID=
GCLOUD_HOSTED_LOGS_URL=
GCLOUD_FM_URL=
GCLOUD_FM_HOSTED_ID=
GCLOUD_FM_POLL_FREQUENCY=60s
```

Treat `GCLOUD_RW_API_KEY` as a secret. If it was pasted into chat or a screenshot, rotate it in Grafana Cloud after setup.

## 3. Generate The Local Alloy Config

```powershell
cd C:\Users\ADMIN\software-engineering\backend
powershell -NoProfile -ExecutionPolicy Bypass -File observability\scripts\generate_alloy_config.ps1
```

This creates:

```text
backend/observability/alloy/config.local.alloy
```

The generated file is ignored by git.

## 4. Run Alloy With The Local Config

If Alloy is installed as a Windows service by Grafana Cloud's script, use the service config location from the installer. Copy `config.local.alloy` there, or point Alloy to it when running manually.

Manual run shape:

```powershell
alloy run C:\Users\ADMIN\software-engineering\backend\observability\alloy\config.local.alloy
```

The Team2+3 worker must be running with:

```powershell
$env:OBSERVABILITY_PROMETHEUS_PORT="9108"
python -c "from ingestion.stream_consumer import StreamConsumerService; StreamConsumerService().run_forever()"
```

## 5. Verify In Grafana Cloud

Open Explore in Grafana Cloud Prometheus and query:

```promql
up{job="health-realtime-evaluation"}
```

Expected:

```text
1
```

Then run:

```promql
health_realtime_messages_total
```

If this returns data after an evaluation run, the Alloy path works.
