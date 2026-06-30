# Hospital critical-alert webhook v1

CareSignal sends `POST` JSON with `patient_token`, `severity`, `escalation_reason`, `department`, `ack_deadline`, and `deep_link` only. `escalation_reason` is `ack_overdue` or `assignment_overdue`. It never sends patient name, MRN, diagnosis, vitals, narrative, or treatment details.

Headers:

- `X-CareSignal-Event-ID`: UUID used for receiver deduplication.
- `X-CareSignal-Signature`: `sha256=<HMAC-SHA256(raw-body, shared-secret)>`.

The receiver should return 2xx and may return `X-Webhook-Receipt`. Delivery attempts and receipt are written to `alert_deliveries`. Non-2xx/timeout is retried by the scheduler and paged; the manual escalation runbook remains authoritative.
