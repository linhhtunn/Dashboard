# CareSignal production implementation handover

## Current status

The code implementation from `codex/production-hardening` commit `dce961d` is merged into
`lpn/fe`, based on synchronized `main` commit `0e2c371`. It is production-shaped but **not approved for go-live**: legal,
hospital, vendor, penetration-test, restore-drill, load-test, shadow-run and clinical
sign-offs remain external gates in `PRODUCTION-GO-LIVE-GATES.md`.

Verified locally on 30/06/2026:

- Frontend: lint passes, 7 unit tests pass, production build passes (55 routes).
- AI backend: 183 tests pass, 5 infrastructure/optional-fixture tests skip locally.
- Ingestion: 6 contract tests pass.

## Runtime architecture

- `frontend/`: Next.js BFF/UI for Vercel. `proxy.ts` authenticates API/page requests and
  denies admin clinical APIs unless a 15-minute audited break-glass grant is active.
- `backend/ai_agent/`: constrained FastAPI CDSS for Cloud Run. It has explicit
  `AI_MODE=off|summary|cdss`, production configuration validation, PHI redaction,
  citation/safety checks and versioned AI audit writes.
- `backend/ingestion/`: CloudAMQP consumer for Cloud Run. Messages are strict schema v1,
  PHI-minimized, deduplicated, persisted with an outbox, retried and dead-lettered.
- Supabase owns auth, roles, alert workflow, assignment, operational encounter, audit,
  idempotency, delivery ledger and outbox. Timescale owns vitals. HIS/EMR remains canonical.
- `infra/terraform/` and GitHub workflows define environment separation, CI/security scans,
  immutable Cloud Run deployment, Secret Manager, logging and the 99.9% SLO.

## Alert workflow

State machine:

`open → acknowledged → nurse_treated | needs_follow_up | suspected_noise → doctor_confirmed | noise`

- Assignment is independent in `portal_alert_assignments`.
- Warning/info noise closes as `noise`; critical noise becomes `suspected_noise` and only
  the assigned doctor can use `doctor_confirm_noise`.
- Every workflow request requires `Idempotency-Key`; the response carries a correlation ID.
- `clinical_audit_events` and `ai_interaction_audit` are append-only by database trigger.
- UI receipt, acknowledgement, webhook attempts and receipt are stored in `alert_deliveries`.
- The one-minute escalation job sends a signed, PHI-minimal hospital webhook for critical
  ack >60 seconds or assignment >5 minutes. Shadow mode records but does not transmit.

## Migrations and configuration

Apply migrations in filename order; the production additions are in
`frontend/supabase/migrations/20260630_production_workflow.sql`. Test RLS using real
coordinator, doctor and admin JWTs before any data load.

Copy `frontend/.env.example`, then provide secrets through Vercel/GCP secret stores. A
production build fails when required variables are absent, when the AI URL is an HF Space,
or when live dispatch is enabled without `PHI_PROCESSING_APPROVED=true`.

Never put PHI or secrets into `.env.example`, Terraform state, CI logs, tickets or tracing.
Langfuse content capture and raw patient identifiers are rejected in production.

## Developer commands

```powershell
cd frontend
npm ci
npm run lint
npm run test:unit
npm run build

cd ..\backend\ai_agent
python -m pytest -q

cd ..\ingestion
python -m pip install -e .
python -m pytest -q
```

Load/SLO scripts and acceptance instructions are in `load-tests/` and
`docs/TEST_AND_ACCEPTANCE.md`. Operational procedures are under `docs/runbooks/`.

## Known remaining gates

- Execute PostgreSQL/Timescale integration tests without skips in staging.
- Validate the SQL migration and all role × department × assignment RLS cases against a
  disposable Supabase project.
- Provision vendor projects/credentials, test Cloud Run deploy/rollback and validate IaC.
- Run 100 vitals/second plus 50 users, duplicate/replay/outage/failover tests.
- Complete external penetration test and a measured PITR restore proving RPO ≤5m/RTO ≤30m.
- Complete 14-day/10-shift shadow run, hospital clinical adjudication and controlled rollout.
