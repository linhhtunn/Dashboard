# Production Requirements

## Governance

- GOV-01: Production mode must reject demo auth, mock clinical data, and fixture AI repositories.
- GOV-02: Real PHI is blocked until legal/cross-border approval is recorded.
- GOV-03: Retention, deletion, incident response, and clinical safety ownership are documented.

## Identity and data governance

- ID-01: Coordinator, doctor, and admin permissions are enforced server-side and by RLS.
- ID-02: Admin cannot access PHI without audited break-glass approval.
- ID-03: All clinical mutations produce immutable audit events with actor, correlation ID, timestamp, and payload metadata.

## Integration and workflow

- INT-01: HIS/EMR adapter supports FHIR R4 first and a controlled signed-batch fallback.
- INT-02: Vitals ingestion validates schema, deduplicates messages, supports retry/DLQ, and sustains 100 messages/second.
- WF-01: Alert workflow supports acknowledgement and suspected-noise states while preserving existing actions.
- WF-02: Every mutation is idempotent.
- WF-03: Critical alerts escalate after 60 seconds without acknowledgement and require doctor assignment within 5 minutes.
- WF-04: Critical suspected-noise alerts require doctor confirmation.
- WF-05: Delivery attempts, receipts, acknowledgements, and escalation timestamps are persisted.

## AI safety

- AI-01: AI mode is independently switchable between off, summary, and constrained CDSS.
- AI-02: AI abstains when required data is missing and does not invent diagnosis, dose, frequency, or treatment duration.
- AI-03: AI audit records model, prompt, rule, tool, citation, and feedback versions without raw PHI logging.

## Reliability and release

- OPS-01: CI gates lint, build, tests, migration validation, secret scan, dependency scan, and container/IaC scan.
- OPS-02: Readiness/liveness, redacted observability, rate limiting, backup, restore, and rollback are documented and tested.
- OPS-03: Load and resilience tests prove the locked SLO and pilot scale.
- REL-01: Production release uses shadow/live kill switches and a controlled rollout runbook.

