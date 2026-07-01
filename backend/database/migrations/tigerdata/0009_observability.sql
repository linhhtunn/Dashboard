-- Realtime observability/evaluation tables for Team 1 -> Team 2+3 -> Team 4.

CREATE TABLE IF NOT EXISTS test_runs (
  run_id text PRIMARY KEY,
  profile text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'passed', 'warning', 'failed', 'stopped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text
);

CREATE TABLE IF NOT EXISTS test_run_steps (
  id bigserial PRIMARY KEY,
  time timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  step text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'warning', 'failed', 'skipped')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS perf_trace_events (
  time timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  trace_id text,
  message_id text,
  alert_id text,
  patient_id text,
  abnormal_event_time timestamptz,
  component text NOT NULL,
  stage text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  duration_ms double precision,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS perf_queue_samples (
  time timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  queue_name text NOT NULL,
  message_count integer,
  consumer_count integer,
  unacked_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS evaluation_results (
  time timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  metric text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'warning', 'failed', 'info')),
  value_numeric double precision,
  value_text text,
  threshold text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

SELECT create_hypertable('perf_trace_events', 'time', if_not_exists => TRUE);
SELECT create_hypertable('perf_queue_samples', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_test_run_steps_run_time
  ON test_run_steps (run_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_perf_trace_run_stage_time
  ON perf_trace_events (run_id, stage, time DESC);

CREATE INDEX IF NOT EXISTS idx_perf_trace_alert
  ON perf_trace_events (alert_id, time DESC)
  WHERE alert_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_perf_queue_run_queue_time
  ON perf_queue_samples (run_id, queue_name, time DESC);

CREATE INDEX IF NOT EXISTS idx_evaluation_results_run_metric_time
  ON evaluation_results (run_id, metric, time DESC);
