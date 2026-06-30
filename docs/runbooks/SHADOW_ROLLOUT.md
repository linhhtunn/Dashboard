# Shadow and controlled rollout

## Shadow gate

- Use only synthetic/de-identified data until legal, DPA/subprocessor, cross-border, retention, incident-response, and hospital approvals are attached to the go-live evidence pack.
- Run at least 14 calendar days and 10 shifts. Shadow alerts must not change the hospital's real clinical workflow.
- Inject a known critical event every shift and reconcile detection, UI delivery, delivery ledger, webhook shadow receipt, ack simulation, and audit event.
- The clinical council adjudicates false positives, missed events, citations, abstention, medication safety, and prompt-injection cases; it owns pass thresholds.

## Controlled live gate

1. Rehearse manual fallback and both kill switches.
2. Enable one department for one shift with 24/7 hypercare.
3. Review incidents and SLOs daily. Roll back on any missed critical delivery, unsafe AI response, unauthorized PHI access, or unrecoverable audit gap.
4. Expand to the full department only after seven stable days; add another department only after 14 stable days and a new sign-off.
