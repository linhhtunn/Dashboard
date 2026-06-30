# Production test and acceptance matrix

| Gate | Command/evidence | Pass condition |
|---|---|---|
| Frontend quality | `npm run lint && npm run test:unit && npm run build` | zero lint errors; all tests/build pass |
| AI baseline | `python -m pytest -q` in `backend/ai_agent` | 183 pass; integration skips must run in staging |
| Ingestion contract | `python -m pytest -q` in `backend/ingestion` | schema, PHI rejection, signed batch pass |
| RBAC/RLS | migration integration suite against staging Supabase | every role × department × assignment case passes |
| 50 users | `k6 run load-tests/k6-clinical-api.js` | errors <1%, p95 <2 seconds |
| 100 vitals/s | run `scripts/load_vitals.py` beside k6 | no duplicate rows; consumer lag recovers; replay is safe |
| Resilience | duplicate/redelivery, webhook/OpenAI/Timescale outage, expired JWT, DB failover | safe retry/abstention/manual fallback; no silent loss |
| DR | production-like restore drill | measured RPO ≤5m and RTO ≤30m |
| Security | secret/dependency/container/IaC scan + external penetration test | no open critical/high finding without signed exception |

The five local skips are infrastructure integrations (PostgreSQL/Timescale or the optional MIMIC fixture), not accepted as production evidence. CI/staging must supply those data services and archive the unskipped report.
