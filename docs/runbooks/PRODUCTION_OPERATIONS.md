# CareSignal production operations

## Runtime controls

- Default production posture: `AI_MODE=off`, `ALERT_DISPATCH_MODE=shadow`, `PHI_PROCESSING_APPROVED=false`.
- AI enablement order: `off → summary → cdss`, with hospital clinical-safety approval before each increase.
- Alert dispatch order: `shadow → live`; `live` is rejected unless `PHI_PROCESSING_APPROVED=true`.
- Rollback: route Cloud Run traffic to the previous healthy revision, then set both kill switches to their safe values.

## Incident response

1. Declare severity and incident commander; preserve correlation IDs and append-only audit.
2. For missed or delayed critical alerts, set dispatch to `shadow`, notify the hospital duty lead, and activate the manual phone/pager workflow.
3. For suspected PHI exposure, stop affected egress, revoke vendor credentials, preserve logs, and invoke the hospital/DPO notification process.
4. Do not put patient names, email, MRN, raw prompts, or clinical notes in tickets or chat channels.
5. Close only after timeline, impact, root cause, corrective actions, and hospital sign-off are recorded.

## Backup and restore drill

1. Record the Supabase PITR point and Timescale backup timestamp before the drill.
2. Restore into an isolated production-like project with network access restricted to the drill team.
3. Replay outbox/CloudAMQP messages from the recorded watermark; verify deduplication keys prevent duplicates.
4. Validate alert state, assignments, delivery ledger, encounters, audit count, and a sample of vitals.
5. Capture measured RPO and RTO. Gate fails if RPO >5 minutes or RTO >30 minutes.
6. Destroy the isolated restore after evidence is approved under the retention policy.

## SLO alerts

- Monthly availability objective: 99.9%.
- Page at critical alert UI delivery p95 ≥2 seconds for 5 minutes, any missed critical test event, ack overdue at 60 seconds, or assignment overdue at 5 minutes.
- Page on DLQ growth, consumer lag, webhook failures, elevated 5xx, database saturation, and backup/PITR failures.
