---
status: resolved
trigger: "Missing public.idempotency_keys and page render latency above 3 seconds"
created: 2026-07-01
updated: 2026-07-01
---

## Symptoms

- Expected: authenticated pages render within 3 seconds and delivery receipts succeed.
- Actual: delivery receipt returned a missing `public.idempotency_keys` schema-cache error; login/dashboard fanned out duplicate profile and clinical requests.
- Reproduction: sign in, navigate to a dashboard or admin users, and allow the global alert modal to display a critical alert.

## Current Focus

- hypothesis: confirmed
- test: lint, unit tests, production build, and warm browser navigation timing
- expecting: development gracefully degrades for absent production-only workflow tables; production remains fail-closed; duplicate profile calls collapse to one request and admin skips clinical summary.
- next_action: none

## Evidence

- timestamp: 2026-07-01T11:15:00+07:00
  observation: `idempotency_keys` is created only by `frontend/supabase/migrations/20260630_production_workflow.sql`.
- timestamp: 2026-07-01T11:16:00+07:00
  observation: `useClinicalPersona` was instantiated by the shell, guard, page, and global modal; each instance independently fetched `/api/me/profile`.
- timestamp: 2026-07-01T11:17:00+07:00
  observation: `ClinicalNavbar` requested `/api/clinical/summary` on mount regardless of admin role.
- timestamp: 2026-07-01T11:35:00+07:00
  observation: warm localhost login navigation reached DOM ready in 954 ms; lint, 10 unit tests, and the production build passed.

## Eliminated

- hypothesis: The admin user creation endpoint directly depends on `idempotency_keys`.
  reason: The endpoint has no idempotency call; the observed error originated from global alert delivery receipt activity during page load.

## Resolution

- root_cause: The connected development Supabase schema lacks the production workflow migration, and independent persona consumers duplicated profile requests while role-inappropriate requests ran during initial render.
- fix: Added development-only workflow-storage fallback, preserved production fail-closed behavior, deduplicated profile loading, gated role-specific requests, parallelized admin user reads, and separated render and mutation timeouts.
- verification: ESLint passed; 10/10 unit tests passed; Next.js production build passed; warm browser navigation measured 954 ms.
- files_changed: frontend workflow storage, API timeout/client, persona loading, clinical shell, admin users API/page, and regression tests.
