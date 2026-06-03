import type { AISummary, MedicationCycle, MetricSummary, Patient } from "@/types";

export type IssueId = "spo2" | "blood_pressure" | "heart_rate";

export type DashboardIssue = {
  id: IssueId;
  title: string;
  chipLabel: string;
  actionLabel: string;
  protocolTitle: string;
  protocolSummary: string;
  protocolSteps: string[];
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
  id: "patient-a",
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

export const dashboardSummary: AISummary = {
  patientId: "patient-a",
  locale: "vi",
  question: "Bệnh nhân A có đang ổn định không?",
  answer:
    "Bệnh nhân A chưa có dấu hiệu cần can thiệp khẩn, nhưng vẫn nên tiếp tục theo dõi vì SpO₂ thấp hơn baseline nhẹ và huyết áp tâm thu đang ở vùng đầu trên của ngưỡng nghỉ.",
  keyFindings: [
    "Không có cảnh báo critical mới trong 15 phút gần đây.",
    "SpO₂ thấp hơn baseline gần đây nhưng chưa xuống dưới ngưỡng cần can thiệp.",
    "Huyết áp tâm thu tăng nhẹ so với cửa sổ 15 phút gần nhất.",
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
  generatedAt: "09:41 hôm nay",
  disclaimerKey: "ai_support_only",
};

export function getDashboardSummary(_locale?: unknown) {
  return dashboardSummary;
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
    title: "SpO₂ thấp hơn baseline",
    chipLabel: "SpO₂",
    actionLabel: "Xem phác đồ SpO₂",
    protocolTitle: "Phác đồ theo dõi SpO₂",
    protocolSummary:
      "Ưu tiên xác nhận cảm biến, đối chiếu triệu chứng hô hấp và theo dõi xu hướng SpO₂ trong 15 phút tới.",
    protocolSteps: [
      "Xác nhận cảm biến đặt đúng vị trí và tín hiệu không nhiễu.",
      "Đối chiếu triệu chứng khó thở, tần số thở và màu sắc da niêm.",
      "Theo dõi xu hướng SpO₂ trong 15 phút tiếp theo trước khi escalte.",
    ],
    metricKeys: ["spo2"],
    evidenceIndices: [0],
  },
  {
    id: "blood_pressure",
    title: "Huyết áp tâm thu tăng nhẹ",
    chipLabel: "Huyết áp",
    actionLabel: "Xem phác đồ huyết áp",
    protocolTitle: "Phác đồ rà soát huyết áp",
    protocolSummary:
      "Kiểm tra lại tư thế đo, thời điểm dùng thuốc và độ dao động huyết áp trước khi đưa ra đánh giá sâu hơn.",
    protocolSteps: [
      "Đối chiếu tư thế đo và khoảng nghỉ trước lần đo gần nhất.",
      "Kiểm tra lịch thuốc đang dùng và liều gần nhất.",
      "So sánh huyết áp hiện tại với trung bình 15 phút gần nhất để xác nhận xu hướng.",
    ],
    metricKeys: ["systolic_bp", "diastolic_bp"],
    evidenceIndices: [1],
  },
  {
    id: "heart_rate",
    title: "Nhịp tim cần theo dõi thêm",
    chipLabel: "Nhịp tim",
    actionLabel: "Xem phác đồ nhịp tim",
    protocolTitle: "Phác đồ theo dõi nhịp tim",
    protocolSummary:
      "Giữ nhịp tim trong bối cảnh SpO₂ và trạng thái nghỉ ngơi, tránh đánh giá đơn lẻ chỉ dựa trên một điểm đo.",
    protocolSteps: [
      "So sánh nhịp tim hiện tại với baseline trong 15 phút gần đây.",
      "Đối chiếu nhịp tim với SpO₂ và triệu chứng gần đây.",
      "Tiếp tục theo dõi nếu không có dấu hiệu cảnh báo kèm theo.",
    ],
    metricKeys: ["heart_rate", "hrv_rmssd"],
    evidenceIndices: [2],
  },
];
