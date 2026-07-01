#!/usr/bin/env bash
# Split TIMESCALE_DB_URL / DATABASE_URL into Grafana datasource fields in observability/.env
set -euo pipefail

BACKEND_ENV="${1:-$(cd "$(dirname "$0")/../.." && pwd)/.env}"
OBS_ENV="${2:-$(cd "$(dirname "$0")/.." && pwd)/.env}"

exec python3 "$(dirname "$0")/update_env_from_db_urls.py" "$BACKEND_ENV" "$OBS_ENV"
