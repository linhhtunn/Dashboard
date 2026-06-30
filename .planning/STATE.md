# Project State

**Milestone:** Production Hardening Pilot
**Branch:** `lpn/fe` (production hardening source commit `dce961d` merged)
**Status:** Implementation complete locally; external go-live gates open
**Current phase:** Verification and hospital/vendor rollout evidence

## Implemented

- Production fail-closed auth/config and independent AI/dispatch kill switches.
- CI, security scans, Cloud Run deployment workflow, Docker ingestion runtime and Terraform.
- Department-aware RLS migration, admin no-PHI, audited 15-minute break-glass.
- Alert state machine, idempotency, correlation IDs, append-only audit, assignment checks.
- Realtime alert refresh, UI delivery receipts, delivery ledger and signed escalation webhook.
- CloudAMQP schema v1 ingestion, validation, deduplication, retry/DLQ, outbox and HIS adapters.
- AI production validation, summary/CDSS modes, PHI redaction and versioned interaction audit.
- Load scripts, acceptance matrix, incident/DR and shadow-rollout runbooks.

## Local verification

- Frontend lint: pass.
- Frontend unit tests: 7 passed.
- Frontend production build: pass, 55 routes.
- AI backend: 183 passed, 5 skipped (infrastructure/optional fixtures).
- Ingestion: 6 passed.

## External blockers

- Legal/cross-border/DPA/subprocessor and hospital approvals are not repository artifacts.
- Managed vendor environments and production credentials are not provisioned here.
- Supabase RLS integration, Cloud Run deploy/rollback, load/resilience, penetration and restore
  drills require staging/production-like infrastructure.
- The required 14-day/10-shift shadow run and clinical sign-off require elapsed hospital use.
