# Production Hardening Roadmap

## Phase 0: Governance and production contract

**Goal:** Establish data classification, legal gates, safety ownership, retention, incident response, and production-mode boundaries.

**Requirements:** GOV-01, GOV-02, GOV-03

## Phase 1: Production foundation

**Goal:** Separate environments, add CI/CD and infrastructure contracts, remove production fallback behavior, and reach a clean lint/build/test baseline.

**Requirements:** GOV-01, OPS-01

## Phase 2: Identity and data governance

**Goal:** Enforce least-privilege RBAC/RLS, admin no-PHI, break-glass access, and immutable audit events.

**Requirements:** ID-01, ID-02, ID-03

## Phase 3: Hybrid integration and ingestion

**Goal:** Add HIS/EMR adapter contracts, patient ID mapping, durable vitals ingestion, idempotency, and DLQ handling.

**Requirements:** INT-01, INT-02

## Phase 4: Clinical workflow and realtime delivery

**Goal:** Add acknowledgement, critical-noise review, durable delivery ledger, realtime refresh, and webhook escalation.

**Requirements:** WF-01, WF-02, WF-03, WF-04, WF-05

## Phase 5: Constrained AI

**Goal:** Enforce AI kill switches, grounded/abstaining behavior, PHI minimization, versioned audit, and clinical evaluation gates.

**Requirements:** AI-01, AI-02, AI-03

## Phase 6: Reliability and security verification

**Goal:** Add observability, rate limits, load/resilience/security tests, backup/restore contracts, and release evidence.

**Requirements:** OPS-01, OPS-02, OPS-03

## Phase 7: Shadow and controlled rollout

**Goal:** Provide shadow-mode telemetry, UAT, controlled rollout, kill-switch, hypercare, and external sign-off runbooks.

**Requirements:** REL-01, GOV-02

