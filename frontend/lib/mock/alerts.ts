import type { Alert } from "@/types";

export const mockAlerts: Alert[] = [
  {
    id: "alert-001",
    patientId: "p-001",
    type: "high_heart_rate",
    severity: "warning",
    message: "Heart rate exceeded review threshold during the last window.",
    score: 7.2,
    evidence: [
      {
        metric: "heart_rate",
        value: 124,
        unit: "bpm",
        timestamp: "2026-06-02T08:09:00Z",
        note: "Abnormal signal requires clinician review.",
      },
    ],
    timestamp: "2026-06-02T08:09:00Z",
    acknowledged: false,
  },
  {
    id: "alert-002",
    patientId: "p-003",
    type: "high_blood_pressure",
    severity: "critical",
    message: "Blood pressure is outside the expected monitoring range.",
    score: 8.4,
    evidence: [
      {
        metric: "blood_pressure",
        value: 152,
        unit: "mmHg",
        timestamp: "2026-06-02T08:08:00Z",
        note: "Critical signal requires immediate clinical confirmation.",
      },
    ],
    timestamp: "2026-06-02T08:08:00Z",
    acknowledged: false,
  },
];
