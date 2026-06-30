# CareSignal Production Pilot

## Objective

Harden CareSignal from a demo/pilot application into a production-capable clinical operations pilot for one hospital, serving coordinator, doctor, and admin roles.

## Product boundaries

- HIS/EMR remains the source of truth for official patient records.
- CareSignal owns operational alerts, assignments, encounters, audit events, and the minimum vitals copy required for monitoring.
- AI is constrained clinical decision support and never replaces clinician judgment.
- The first release excludes multi-hospital tenancy, floor-nurse login, and a production family portal.
- CareSignal operational encounters are not the legal EMR until an approved write-back integration exists.

## Locked production targets

- One-hospital controlled pilot.
- Availability 99.9%, RPO 5 minutes, RTO 30 minutes.
- Load gate: 100 patients at 1 Hz and 50 concurrent users.
- Critical alert UI delivery p95 below 2 seconds, acknowledgement within 60 seconds, doctor assignment within 5 minutes.
- Critical suspected-noise alerts require doctor review.
- Admin has no PHI access by default; break-glass access requires reason and audit.
- Managed stack: Vercel, Supabase, Timescale Cloud, CloudAMQP, and Cloud Run in Southeast Asia.
- No real PHI may enter global managed infrastructure before legal/cross-border approval.

## External go-live gates

The following cannot be completed by repository changes alone and remain blocking until evidence is attached:

- Hospital legal and clinical-safety approval.
- DPA, transfer-impact assessment, and subprocessor approval.
- Production vendor subscriptions, PITR configuration, and restore evidence.
- External penetration test and incident tabletop.
- Fourteen-day shadow run, clinical adjudication, and controlled rollout sign-off.

