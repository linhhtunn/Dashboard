# Health App Backend Rules

This document turns the strongest patterns from healthcare API, wearable integration, and medical-ML repos into a practical rule set for our backend team.

## 1. Treat all health data as sensitive by default
- Assume every payload can contain PHI/PII.
- Encrypt data in transit and at rest.
- Minimize data access by service, endpoint, and role.
- Never log raw sensitive values unless there is a hard debugging need and the log path is approved.

## 2. Keep raw data and normalized data separate
- Store raw wearable/hospital payloads immutably.
- Build a normalized internal model on top of the raw source.
- Never overwrite the raw event when the parsing logic changes.
- Keep source metadata: provider, device type, timestamp, schema version, sync batch, and ingestion status.

## 3. Prefer a health-standard model whenever possible
- Map incoming clinical data to FHIR-like resources when the source allows it.
- Keep canonical IDs stable across syncs.
- Preserve provenance: who sent the data, when it arrived, and what transformation was applied.
- If the source is not FHIR, create a clear adapter layer rather than mixing source-specific fields into core models.

## 4. Design the pipeline in stages
- Stage 1: ingest
- Stage 2: validate
- Stage 3: normalize
- Stage 4: enrich
- Stage 5: persist
- Stage 6: publish to RAG / anomaly detection
- Stage 7: notify or return results
- Each stage should have its own failure handling and retry policy.

## 5. Validation is mandatory at the boundary
- Reject malformed payloads early.
- Validate timestamps, units, ranges, and required fields.
- Normalize units before downstream processing.
- Record validation failures with reason codes, not just generic errors.

## 6. Preserve clinical meaning
- Do not flatten signals in a way that loses medical context.
- Keep unit, sampling frequency, confidence, and device source with every measurement.
- For time-series data, preserve ordering and window boundaries.
- If you aggregate, keep a link back to the original measurements.

## 7. Build for multiple wearable providers
- Use an adapter per provider.
- Avoid hard-coding provider-specific assumptions into core logic.
- Normalize provider payloads into one internal schema.
- Support provider versioning and backward compatibility.

## 8. Keep the RAG input layer explicit
- Do not send raw data directly into the agent.
- Build a context-packaging layer that selects only relevant facts.
- Include provenance, timestamps, and confidence in the packaged context.
- Separate facts, summaries, alerts, and clinician-facing notes.

## 9. Anomaly detection must be explainable
- Every alert should include the trigger features and threshold/path that caused it.
- Prefer conservative alerts over noisy alerts.
- Tune for sensitivity and specificity separately.
- Keep a clear distinction between screening signals and diagnosis.

## 10. Never let the model act as a doctor
- The system may triage, prioritize, summarize, or flag risk.
- It must not present itself as making a diagnosis.
- Medical decisions must remain clinician-controlled.
- Responses should be phrased as risk indicators, not medical certainty.

## 11. Make evaluation part of the product
- Track ingestion success rate, schema mismatch rate, latency, and retry rate.
- Track anomaly precision, recall, false positive rate, and alert delay.
- Track RAG quality with groundedness, relevance, and citation completeness.
- Evaluate per source type, not just in aggregate.

## 12. Use reproducible ML/data workflows
- Fix random seeds where possible.
- Version datasets, features, rules, and model configs.
- Keep notebook experiments separate from production code.
- Promote only validated logic into the backend pipeline.

## 13. Be strict about time
- Use UTC internally.
- Store original timezone when it matters clinically.
- Never compare timestamps without checking source timezone and device clock drift.
- Detect duplicates and out-of-order events.

## 14. Build for auditability
- Log state transitions: received, validated, normalized, enriched, published, alerted.
- Keep audit logs for access and data modification.
- Include request IDs and correlation IDs across services.
- Make it easy to trace one alert back to the source measurement.

## 15. Security rules are part of the architecture
- Use least privilege for services and API keys.
- Rate limit endpoints that accept device or patient data.
- Sign or authenticate all provider/webhook callbacks.
- Treat external integrations as untrusted until verified.

## 16. Testing must match the domain
- Test with synthetic wearable payloads, hospital payloads, and malformed payloads.
- Add fixtures for normal, borderline, and anomalous cases.
- Include regression tests for every schema change.
- Test retry, timeout, duplicate delivery, and partial failure paths.

## 17. Preferred implementation shape
- FastAPI for HTTP APIs.
- Pydantic for strict request/response schemas.
- Background jobs for sync, enrichment, and alert generation.
- Separate modules for adapters, normalizers, rules, ML, and RAG context building.

## 18. Default product stance
- If data is uncertain, say so.
- If context is incomplete, ask for more data or mark the result as provisional.
- If a feature may affect patient safety, fail closed rather than guessing.

## Practical priorities for this project
1. Ingestion correctness first.
2. Data normalization and provenance second.
3. Explainable anomaly detection third.
4. RAG context quality fourth.
5. UI/response generation last.

## Suggested module split
- `adapters/` for wearable and hospital sources
- `schemas/` for internal contracts
- `pipelines/` for ingest and normalization
- `signals/` for rules and anomaly detection
- `rag_context/` for context packaging
- `audit/` for logs and traceability
- `tests/` for fixtures and regression coverage

