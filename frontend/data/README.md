# Clinical seed data

JSON seed files for the demo API layer. Edit these files to change mock clinical data.

| File | Content |
|------|---------|
| `patients.seed.json` | Patient census (codes for ward, department, conditions) |
| `alerts.seed.json` | Clinical alerts |
| `vitals.seed.json` | Vital sign time series |
| `shifts/roster.seed.json` | On-duty staff roster |
| `shifts/shift.seed.json` | Current shift metadata |
| `operator-session.seed.json` | Default operator actor bindings |

Regenerate from scripts:

```bash
node scripts/build-all-seeds.mjs
node scripts/export-seeds.mjs
```

## Switching to a real backend

Set `NEXT_PUBLIC_CLINICAL_API_BASE` to your API origin. Repositories use `lib/api/client.ts` — no component changes required.
