import type {
  AISummary,
  Locale,
  LocalizedString,
  MedicationCycle,
  MetricSummary,
  Patient,
} from "@/types";

export type IssueId = "spo2" | "blood_pressure" | "heart_rate";

export type DashboardIssue = {
  id: IssueId;
  title: LocalizedString;
  chipLabel: LocalizedString;
  actionLabel: LocalizedString;
  protocolTitle: LocalizedString;
  protocolSummary: LocalizedString;
  protocolSteps: LocalizedString[];
  metricKeys: MetricSummary["metric"][];
  evidenceIndices: number[];
};

const medicationCycle: MedicationCycle[] = [
  {
    medication: {
      vi: "Aspirin",
      en: "Aspirin",
    },
    dosage: "81 mg",
    schedule: {
      vi: "10:30 AM",
      en: "10:30 AM",
    },
    lastTakenAt: "2026-06-02T08:30:00Z",
    nextDoseAt: "2026-06-02T10:30:00Z",
  },
];

export const dashboardPatient: Patient = {
  id: "P001",
  mrn: "12345678",
  name: "Bệnh nhân A",
  age: 68,
  gender: "male",
  status: "healthy",
  wardCode: "cardiology_ward",
  wardLabel: {
    vi: "Khoa Tim mạch",
    en: "Cardiology Ward",
  },
  bed: "12A",
  underlyingConditionCodes: [
    "hypertension",
    "type_2_diabetes",
    "ischemic_heart_disease",
  ],
  medicationCycle,
  recentSymptomCodes: ["shortness_of_breath"],
  lastUpdated: "2026-06-02T09:41:00Z",
};

export function getDashboardSummary(locale: Locale): AISummary {
  return {
    patientId: "P001",
    locale,
    question:
      locale === "vi"
        ? "Bệnh nhân A có đang ổn định không?"
        : "Is Patient A currently stable?",
    answer:
      locale === "vi"
        ? "Bệnh nhân A chưa có dấu hiệu cần can thiệp khẩn, nhưng vẫn nên tiếp tục theo dõi vì SpO₂ thấp hơn baseline nhẹ và huyết áp tâm thu đang ở vùng đầu trên của ngưỡng nghỉ."
        : "Patient A does not currently show signs requiring urgent intervention, but continued monitoring is recommended because SpO₂ is slightly below baseline and systolic blood pressure is near the upper resting threshold.",
    keyFindings:
      locale === "vi"
        ? [
            "Không có cảnh báo critical mới trong 15 phút gần đây.",
            "SpO₂ thấp hơn baseline gần đây nhưng chưa xuống dưới ngưỡng cần can thiệp.",
            "Huyết áp tâm thu tăng nhẹ so với cửa sổ 15 phút gần nhất.",
          ]
        : [
            "No new critical alerts have appeared in the last 15 minutes.",
            "SpO₂ is below recent baseline but has not dropped below the intervention threshold.",
            "Systolic blood pressure is mildly elevated versus the latest 15-minute window.",
          ],
    status: "ready",
    confidence: "medium",
    evidence: [
      {
        kind: "metric_threshold",
        metric: "spo2",
        value: 94,
        unit: "%",
        timestamp: "2026-06-02T09:39:00Z",
        noteKey: "spo2_below_recent_baseline",
      },
      {
        kind: "trend_change",
        metric: "systolic_bp",
        value: 124,
        unit: "mmHg",
        comparisonValue: 118,
        comparisonWindow: "15m",
        timestamp: "2026-06-02T09:40:00Z",
      },
      {
        kind: "trend_change",
        metric: "heart_rate",
        value: 82,
        unit: "bpm",
        comparisonValue: 76,
        comparisonWindow: "15m",
        timestamp: "2026-06-02T09:40:00Z",
      },
    ],
    generatedAt: new Date().toISOString(),
    disclaimerKey: "ai_support_only",
  };
}

export const dashboardMetrics: MetricSummary[] = [
  {
    metric: "heart_rate",
    currentValue: 72,
    unit: "bpm",
    average15Min: 75,
    trend: "down",
    changePct: -4,
    status: "healthy",
  },
  {
    metric: "hrv_rmssd",
    currentValue: 42,
    unit: "ms",
    average15Min: 39,
    trend: "up",
    changePct: 6,
    status: "healthy",
  },
  {
    metric: "spo2",
    currentValue: 94,
    unit: "%",
    average15Min: 95,
    trend: "down",
    changePct: -1,
    status: "recent_symptom",
  },
  {
    metric: "systolic_bp",
    currentValue: 118,
    unit: "mmHg",
    average15Min: 121,
    trend: "down",
    changePct: -3,
    status: "healthy",
  },
  {
    metric: "diastolic_bp",
    currentValue: 76,
    unit: "mmHg",
    average15Min: 78,
    trend: "down",
    changePct: -2,
    status: "healthy",
  },
];

export const dashboardIssues: DashboardIssue[] = [
  {
    id: "spo2",
    title: {
      vi: "SpO₂ thấp hơn baseline",
      en: "SpO₂ below baseline",
    },
    chipLabel: { vi: "SpO₂", en: "SpO₂" },
    actionLabel: {
      vi: "Xem phác đồ SpO₂",
      en: "Open SpO₂ protocol",
    },
    protocolTitle: {
      vi: "Phác đồ theo dõi SpO₂",
      en: "SpO₂ monitoring protocol",
    },
    protocolSummary: {
      vi: "Ưu tiên xác nhận cảm biến, đối chiếu triệu chứng hô hấp và theo dõi xu hướng SpO₂ trong 15 phút tới.",
      en: "Prioritize sensor validation, compare respiratory symptoms, and monitor the SpO₂ trend over the next 15 minutes.",
    },
    protocolSteps: [
      {
        vi: "Xác nhận cảm biến đặt đúng vị trí và tín hiệu không nhiễu.",
        en: "Confirm that the sensor is positioned correctly and the signal is free from noise.",
      },
      {
        vi: "Đối chiếu triệu chứng khó thở, tần số thở và màu sắc da niêm.",
        en: "Cross-check shortness of breath, respiratory rate, and skin or mucosal color.",
      },
      {
        vi: "Theo dõi xu hướng SpO₂ trong 15 phút tiếp theo trước khi escalate.",
        en: "Observe the SpO₂ trend for the next 15 minutes before escalating.",
      },
    ],
    metricKeys: ["spo2"],
    evidenceIndices: [0],
  },
  {
    id: "blood_pressure",
    title: {
      vi: "Huyết áp tâm thu tăng nhẹ",
      en: "Mild systolic blood pressure elevation",
    },
    chipLabel: { vi: "Huyết áp", en: "Blood pressure" },
    actionLabel: {
      vi: "Xem phác đồ huyết áp",
      en: "Open blood pressure protocol",
    },
    protocolTitle: {
      vi: "Phác đồ rà soát huyết áp",
      en: "Blood pressure review protocol",
    },
    protocolSummary: {
      vi: "Kiểm tra lại tư thế đo, thời điểm dùng thuốc và độ dao động huyết áp trước khi đưa ra đánh giá sâu hơn.",
      en: "Re-check measurement posture, medication timing, and blood pressure variability before making a deeper assessment.",
    },
    protocolSteps: [
      {
        vi: "Đối chiếu tư thế đo và khoảng nghỉ trước lần đo gần nhất.",
        en: "Review the measurement posture and rest period before the latest reading.",
      },
      {
        vi: "Kiểm tra lịch thuốc đang dùng và liều gần nhất.",
        en: "Check the current medication plan and the most recent dose.",
      },
      {
        vi: "So sánh huyết áp hiện tại với trung bình 15 phút gần nhất để xác nhận xu hướng.",
        en: "Compare the current blood pressure with the latest 15-minute average to confirm the trend.",
      },
    ],
    metricKeys: ["systolic_bp", "diastolic_bp"],
    evidenceIndices: [1],
  },
  {
    id: "heart_rate",
    title: {
      vi: "Nhịp tim cần theo dõi thêm",
      en: "Heart rate needs closer monitoring",
    },
    chipLabel: { vi: "Nhịp tim", en: "Heart rate" },
    actionLabel: {
      vi: "Xem phác đồ nhịp tim",
      en: "Open heart rate protocol",
    },
    protocolTitle: {
      vi: "Phác đồ theo dõi nhịp tim",
      en: "Heart rate monitoring protocol",
    },
    protocolSummary: {
      vi: "Giữ nhịp tim trong bối cảnh SpO₂ và trạng thái nghỉ ngơi, tránh đánh giá đơn lẻ chỉ dựa trên một điểm đo.",
      en: "Interpret heart rate alongside SpO₂ and resting state instead of relying on a single isolated reading.",
    },
    protocolSteps: [
      {
        vi: "So sánh nhịp tim hiện tại với baseline trong 15 phút gần đây.",
        en: "Compare the current heart rate with the recent 15-minute baseline.",
      },
      {
        vi: "Đối chiếu nhịp tim với SpO₂ và triệu chứng gần đây.",
        en: "Cross-check heart rate with SpO₂ and recent symptoms.",
      },
      {
        vi: "Tiếp tục theo dõi nếu không có dấu hiệu cảnh báo kèm theo.",
        en: "Continue monitoring if no accompanying warning signs are present.",
      },
    ],
    metricKeys: ["heart_rate", "hrv_rmssd"],
    evidenceIndices: [2],
  },
];
