# CareSignal production go-live gates

CareSignal must remain in synthetic/de-identified or shadow mode until every blocking item below has evidence and an accountable approver.

## Governance evidence

- [ ] Hospital data owner approves the data inventory and processing purposes.
- [ ] Legal approves cross-border transfer, DPA, subprocessors, privacy notice, and retention/deletion policy.
- [ ] Clinical safety owner approves alert thresholds, escalation SLA, AI intended use, and manual fallback.
- [ ] Security owner approves threat model, incident response, access review, and break-glass procedure.

## Platform evidence

- [ ] Production, staging, and development use separate projects and credentials.
- [ ] Supabase RLS, SSL enforcement, network restrictions, MFA, PITR, and restore evidence are attached.
- [ ] Vercel production/preview protection and log export are enabled.
- [ ] FastAPI, dispatcher, and ingestion run on the approved Cloud Run region; Hugging Face is absent from production config.
- [ ] Timescale and CloudAMQP regions, backup, DLQ, and support plans are approved.

## Verification evidence

- [ ] CI security/quality gates pass on the release commit.
- [ ] RLS/RBAC matrix and clinical workflow E2E tests pass.
- [ ] 100-patient/1-Hz and 50-user load test meets SLO.
- [ ] Backup restore demonstrates RPO <= 5 minutes and RTO <= 30 minutes.
- [ ] External penetration test has no unresolved high/critical finding.
- [ ] Incident tabletop and kill-switch drill complete.

## Rollout evidence

- [ ] Shadow mode ran for at least 14 days and 10 shifts.
- [ ] Clinical adjudication thresholds are signed.
- [ ] No injected critical event was missed by the delivery pipeline.
- [ ] One-ward/one-shift controlled rollout has an on-call owner and manual fallback.
- [ ] Expansion after 7 and 14 days is explicitly approved.

