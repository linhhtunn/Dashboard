import type {
  AgentChatProxyPayload,
  AgentInsightPayload,
  DashboardIssueId,
} from "@/lib/ai/types";
import type {
  AlertSeverity,
  Evidence,
  Gender,
  Locale,
} from "@/types";

type MockPatientContext = {
  id: string;
  name?: string;
  age?: number;
  gender?: Gender;
  wardLabel?: string;
  bed?: string;
  latestVitals?: {
    heartRate?: number;
    respiratoryRate?: number;
    spo2?: number;
    systolicBp?: number;
    diastolicBp?: number;
  };
  alerts?: Array<{
    type: string;
    severity: AlertSeverity;
  }>;
};

type BuildMockChatPayloadArgs = {
  locale: Locale;
  message: string;
  patientId: string;
  patientContext?: MockPatientContext | null;
  threadId: string;
  title: string;
};

type MockScenario = {
  answer: string;
  keyFindings: string[];
  recommendedIssueId: DashboardIssueId | null;
  suggestedIssueIds: DashboardIssueId[];
  focusMetrics: string[];
  nextActions: string[];
  evidence: Evidence[];
  confidence: "low" | "medium" | "high";
};

const demoPromptMatchers = [
  /t[oó]m t[aắ]t|summary|current status/i,
  /1 gi[oờ]|last hour|changed|thay đ[oổ]i/i,
  /r[ủu]i ro|deterioration|risk/i,
  /ưu tiên|priority|prioritized|theo dõi/i,
];

export function shouldUseMockChatResponse(message: string, baseUrl?: string | null) {
  if (!baseUrl) return true;
  return demoPromptMatchers.some((matcher) => matcher.test(message));
}

type BuildMockExplainAlertPayloadArgs = {
  locale: Locale;
  alertId: string;
  patientId: string;
  alertType?: string;
  severity?: AlertSeverity;
  metricLabel?: string;
  metricValue?: number;
  metricUnit?: string;
};

export function buildMockExplainAlertPayload({
  locale,
  alertId,
  patientId,
  alertType = "clinical_alert",
  severity = "warning",
  metricLabel,
  metricValue,
  metricUnit = "",
}: BuildMockExplainAlertPayloadArgs): AgentInsightPayload {
  const generatedAt = new Date().toISOString();
  const severityLabel =
    severity === "critical"
      ? locale === "vi"
        ? "nghiêm trọng"
        : "critical"
      : severity === "warning"
        ? locale === "vi"
          ? "cảnh báo"
          : "warning"
        : locale === "vi"
          ? "thông tin"
          : "informational";

  const metricSnippet =
    metricLabel && metricValue !== undefined
      ? locale === "vi"
        ? `${metricLabel} hiện ${metricValue}${metricUnit}`
        : `${metricLabel} is currently ${metricValue}${metricUnit}`
      : locale === "vi"
        ? "chỉ số liên quan vượt ngưỡng theo dõi"
        : "the related metric crossed the monitoring threshold";

  const answer =
    locale === "vi"
      ? `Cảnh báo **${alertId}** (${alertType.replace(/_/g, " ")}) được đánh giá mức **${severityLabel}**. ${metricSnippet}. Hệ thống ghi nhận tín hiệu cần đối chiếu với triệu chứng lâm sàng và xu hướng 15–30 phút gần nhất trước khi quyết định can thiệp. Nếu bệnh nhân có khó thở, tím tái hoặc huyết áp tiếp tục tăng, nên ưu tiên đánh giá trực tiếp.`
      : `Alert **${alertId}** (${alertType.replace(/_/g, " ")}) is classified as **${severityLabel}**. ${metricSnippet}. The signal should be cross-checked with clinical symptoms and the trend over the last 15–30 minutes before deciding on intervention. If the patient shows dyspnea, cyanosis, or rising blood pressure, prioritize an in-person assessment.`;

  const keyFindings =
    locale === "vi"
      ? [
          `Mức độ: ${severityLabel}`,
          metricSnippet,
          "Cần đối chiếu với triệu chứng và xu hướng gần nhất",
        ]
      : [
          `Severity: ${severityLabel}`,
          metricSnippet,
          "Cross-check with symptoms and the recent trend",
        ];

  return {
    title: locale === "vi" ? "Giải thích cảnh báo" : "Alert explanation",
    responseType: "explain-alert",
    patientId,
    sourceId: "frontend-demo-explain-alert",
    generatedAt,
    intent: "patient_metric_or_protocol",
    suggestedIssueIds: severity === "critical" ? ["blood_pressure", "spo2"] : ["heart_rate"],
    recommendedIssueId: severity === "critical" ? "blood_pressure" : "heart_rate",
    focusMetrics: ["heart_rate", "spo2", "systolic_bp"],
    nextActions:
      locale === "vi"
        ? ["Theo dõi lại chỉ số trong 15–30 phút", "Xác nhận triệu chứng lâm sàng"]
        : ["Recheck vitals in 15–30 minutes", "Confirm clinical symptoms"],
    summary: {
      patientId,
      locale,
      question:
        locale === "vi"
          ? `Giải thích cảnh báo ${alertId}`
          : `Explain alert ${alertId}`,
      answer,
      keyFindings,
      status: "ready",
      confidence: severity === "critical" ? "high" : "medium",
      evidence: [],
      generatedAt,
      disclaimerKey: "ai_support_only",
    },
    visualization: {
      hasChart: false,
      chartType: "time-series",
      chartTitle: "",
      dataPoints: [],
    },
    comparison: {
      hasComparison: false,
      comparisonType: null,
      headers: [],
      rows: [],
    },
  };
}

export function buildMockChatPayload({
  locale,
  message,
  patientId,
  patientContext,
  threadId,
  title,
}: BuildMockChatPayloadArgs): AgentChatProxyPayload {
  const scenario = buildScenario({ locale, message, patientId, patientContext });
  const generatedAt = new Date().toISOString();

  return {
    threadId,
    title,
    responseType: "chat",
    patientId,
    sourceId: "frontend-demo-stream",
    generatedAt,
    intent: "patient_summary",
    suggestedIssueIds: scenario.suggestedIssueIds,
    recommendedIssueId: scenario.recommendedIssueId,
    focusMetrics: scenario.focusMetrics,
    nextActions: scenario.nextActions,
    summary: {
      patientId,
      locale,
      question: message,
      answer: scenario.answer,
      keyFindings: scenario.keyFindings,
      status: "ready",
      confidence: scenario.confidence,
      evidence: scenario.evidence,
      generatedAt,
      disclaimerKey: "ai_support_only",
    },
    visualization: {
      hasChart: false,
      chartType: "time-series",
      chartTitle: "",
      dataPoints: [],
    },
    comparison: {
      hasComparison: false,
      comparisonType: null,
      headers: [],
      rows: [],
    },
  };
}

function buildScenario({
  locale,
  message,
  patientId,
  patientContext,
}: Omit<BuildMockChatPayloadArgs, "threadId" | "title">): MockScenario {
  const prompt = message.toLowerCase();
  const patientLabel = buildPatientLabel(locale, patientId, patientContext);
  const latest = patientContext?.latestVitals ?? {};
  const heartRate = latest.heartRate ?? 76;
  const respiratoryRate = latest.respiratoryRate ?? 16;
  const spo2 = latest.spo2 ?? 98;
  const systolicBp = latest.systolicBp ?? 118;
  const diastolicBp = latest.diastolicBp ?? 76;
  const topAlert = patientContext?.alerts?.[0];

  if (/1 gi[oờ]|last hour|changed|thay đ[oổ]i/i.test(prompt)) {
    return {
      answer:
        locale === "vi"
          ? `${patientLabel} nhìn chung ổn định trong giờ gần nhất. Nhịp tim dao động nhẹ quanh ${heartRate} nhịp/phút, nhịp thở giữ quanh ${respiratoryRate} lần/phút, huyết áp hiện ${systolicBp}/${diastolicBp} mmHg và oxy máu ở ${spo2}%. Chưa thấy tín hiệu cho thấy diễn tiến xấu nhanh.`
          : `${patientLabel} appears broadly stable over the last hour. Heart rate has moved mildly around ${heartRate} bpm, respiratory rate has held near ${respiratoryRate} rpm, blood pressure is ${systolicBp}/${diastolicBp} mmHg, and SpO₂ is ${spo2}%. There is no clear sign of rapid deterioration.`,
      keyFindings:
        locale === "vi"
          ? [
              `Nhịp tim hiện quanh ${heartRate} nhịp/phút và chưa có biến động lớn.`,
              `Nhịp thở giữ ở ${respiratoryRate} lần/phút, chưa thấy biến động rõ.`,
              `Oxy máu ${spo2}% và huyết áp ${systolicBp}/${diastolicBp} mmHg đang trong vùng theo dõi.`,
            ]
          : [
              `Heart rate is around ${heartRate} bpm without large swings.`,
              `Respiratory rate remains near ${respiratoryRate} rpm without a clear change.`,
              `SpO₂ at ${spo2}% and blood pressure at ${systolicBp}/${diastolicBp} mmHg remain in the monitoring range.`,
            ],
      recommendedIssueId: "heart_rate",
      suggestedIssueIds: ["heart_rate", "blood_pressure"],
      focusMetrics: ["heart_rate", "respiratory_rate", "systolic_bp", "diastolic_bp"],
      nextActions:
        locale === "vi"
          ? ["Tiếp tục theo dõi xu hướng 15-30 phút tới", "Đối chiếu thêm với triệu chứng gần đây"]
          : ["Continue monitoring the next 15-30 minute trend", "Cross-check with recent symptoms"],
      evidence: buildEvidence(latest),
      confidence: "high",
    };
  }

  if (/r[ủu]i ro|deterioration|risk/i.test(prompt)) {
    return {
      answer:
        locale === "vi"
          ? `Hiện chưa có dấu hiệu gợi ý nguy cơ diễn tiến xấu ngay lập tức cho ${patientLabel}. Điểm cần để ý nhất là so sánh oxy máu với bối cảnh hô hấp và xác nhận xem cảnh báo gần nhất có phản ánh bất thường sinh lý thật hay chủ yếu là tín hiệu kỹ thuật.`
          : `There is no strong sign of immediate deterioration for ${patientLabel}. The main point to watch is how SpO₂ fits the respiratory context and whether the latest alert reflects true physiology or mostly a technical signal issue.`,
      keyFindings:
        locale === "vi"
          ? [
              "Chưa thấy cụm chỉ số cùng xấu đi đồng thời.",
              `Oxy máu hiện ở ${spo2}% nên vẫn cần đối chiếu với triệu chứng hô hấp.`,
              topAlert
                ? `Cảnh báo gần nhất là ${topAlert.type} ở mức ${topAlert.severity}.`
                : "Chưa có cảnh báo nguy kịch mới trong nhịp theo dõi này.",
            ]
          : [
              "No cluster of metrics is worsening together.",
              `SpO₂ is ${spo2}%, so it should still be checked against respiratory symptoms.`,
              topAlert
                ? `The latest alert is ${topAlert.type} with ${topAlert.severity} severity.`
                : "No new critical alert is visible in this monitoring window.",
            ],
      recommendedIssueId: "spo2",
      suggestedIssueIds: ["spo2", "heart_rate"],
      focusMetrics: ["spo2", "heart_rate", "respiratory_rate"],
      nextActions:
        locale === "vi"
          ? ["Ưu tiên xác nhận cảm biến nếu cảnh báo lặp lại", "Theo dõi thêm xu hướng oxy máu và nhịp tim"]
          : ["Prioritize sensor validation if the alert repeats", "Keep watching the SpO₂ and heart-rate trend"],
      evidence: buildEvidence(latest),
      confidence: "medium",
    };
  }

  if (/ưu tiên|priority|prioritized|theo dõi/i.test(prompt)) {
    return {
      answer:
        locale === "vi"
          ? `Nếu cần chọn một chỉ số để ưu tiên theo dõi cho ${patientLabel}, tôi sẽ đặt oxy máu lên trước, sau đó là nhịp thở và nhịp tim. Oxy máu và nhịp thở phản ánh trực tiếp thay đổi hô hấp, còn nhịp tim giúp xác nhận phản ứng bù trừ.`
          : `If one metric needs to be prioritized for ${patientLabel}, I would watch SpO₂ first, then respiratory rate and heart rate. SpO₂ and respiratory rate reflect respiratory change directly, while heart rate helps confirm a compensatory response.`,
      keyFindings:
        locale === "vi"
          ? [
              "Ưu tiên 1: Oxy máu để phát hiện lệch oxy sớm.",
              `Ưu tiên 2: Nhịp tim hiện ${heartRate} nhịp/phút để xem phản ứng bù trừ.`,
              `Ưu tiên 3: Nhịp thở ${respiratoryRate} lần/phút để đánh giá thay đổi hô hấp.`,
            ]
          : [
              "Priority 1: SpO₂ to detect early oxygen deviation.",
              `Priority 2: Heart rate at ${heartRate} bpm to assess compensatory response.`,
              `Priority 3: Respiratory rate at ${respiratoryRate} rpm to assess respiratory change.`,
            ],
      recommendedIssueId: "spo2",
      suggestedIssueIds: ["spo2", "heart_rate", "blood_pressure"],
      focusMetrics: ["spo2", "heart_rate", "respiratory_rate"],
      nextActions:
        locale === "vi"
          ? ["Giữ cửa sổ theo dõi 15 phút", "Đối chiếu oxy máu với nhịp thở nếu oxy giảm thêm"]
          : ["Keep a 15-minute monitoring window", "Cross-check SpO₂ against respiratory rate if oxygen falls further"],
      evidence: buildEvidence(latest),
      confidence: "high",
    };
  }

  return {
    answer:
      locale === "vi"
        ? `Tóm tắt nhanh cho ${patientLabel}: sinh hiệu hiện chưa gợi ý cần can thiệp khẩn. Nhịp tim ${heartRate} nhịp/phút, nhịp thở ${respiratoryRate} lần/phút, huyết áp ${systolicBp}/${diastolicBp} mmHg và oxy máu ${spo2}%. Nếu có cảnh báo mới, nên ưu tiên đối chiếu cảm biến và bối cảnh lâm sàng trước khi kết luận.`
        : `Quick summary for ${patientLabel}: current vitals do not suggest urgent intervention. Heart rate is ${heartRate} bpm, respiratory rate is ${respiratoryRate} rpm, blood pressure is ${systolicBp}/${diastolicBp} mmHg, and SpO₂ is ${spo2}%. If a new alert appears, sensor validation and clinical context should be checked before drawing conclusions.`,
    keyFindings:
      locale === "vi"
        ? [
            `Nhịp tim ${heartRate} nhịp/phút và huyết áp ${systolicBp}/${diastolicBp} mmHg đang ổn định.`,
            `Nhịp thở ${respiratoryRate} lần/phút chưa cho thấy biến động hô hấp rõ.`,
            `Oxy máu hiện ${spo2}% nên tiếp tục theo dõi theo xu hướng.`,
          ]
        : [
            `Heart rate at ${heartRate} bpm and blood pressure at ${systolicBp}/${diastolicBp} mmHg are stable.`,
            `Respiratory rate at ${respiratoryRate} rpm shows no clear respiratory change.`,
            `SpO₂ is currently ${spo2}% and should continue to be trended.`,
          ],
    recommendedIssueId: "heart_rate",
    suggestedIssueIds: ["heart_rate", "spo2"],
    focusMetrics: ["heart_rate", "respiratory_rate", "spo2"],
    nextActions:
      locale === "vi"
        ? ["Tiếp tục theo dõi định kỳ", "So sánh với cảnh báo gần nhất nếu có bất thường mới"]
        : ["Continue routine monitoring", "Compare against the latest alert if a new abnormality appears"],
    evidence: buildEvidence(latest),
    confidence: "high",
  };
}

function buildPatientLabel(
  locale: Locale,
  patientId: string,
  patientContext?: MockPatientContext | null,
) {
  const name = patientContext?.name?.trim();
  const age = patientContext?.age;
  const gender = patientContext?.gender;

  if (!name) {
    return locale === "vi" ? `bệnh nhân ${patientId}` : `patient ${patientId}`;
  }

  const genderLabel = getGenderLabel(locale, gender);
  const ageLabel =
    typeof age === "number" ? `${age} ${locale === "vi" ? "tuổi" : "years old"}` : null;

  if (ageLabel && genderLabel) {
    return locale === "vi"
      ? `${name}, ${ageLabel}, ${genderLabel}`
      : `${name}, ${ageLabel}, ${genderLabel}`;
  }

  return name;
}

function buildEvidence(latestVitals: MockPatientContext["latestVitals"] = {}) {
  const evidence: Evidence[] = [];

  if (typeof latestVitals.heartRate === "number") {
    evidence.push({
      kind: "metric_threshold",
      metric: "heart_rate",
      value: latestVitals.heartRate,
      unit: "bpm",
      noteKey: "heart_rate_current",
    });
  }

  if (typeof latestVitals.respiratoryRate === "number") {
    evidence.push({
      kind: "metric_threshold",
      metric: "respiratory_rate",
      value: latestVitals.respiratoryRate,
      unit: "rpm",
      noteKey: "respiratory_rate_current",
    });
  }

  if (typeof latestVitals.spo2 === "number") {
    evidence.push({
      kind: "metric_threshold",
      metric: "spo2",
      value: latestVitals.spo2,
      unit: "%",
      noteKey: "spo2_current",
    });
  }

  if (typeof latestVitals.systolicBp === "number") {
    evidence.push({
      kind: "metric_threshold",
      metric: "systolic_bp",
      value: latestVitals.systolicBp,
      unit: "mmHg",
      noteKey: "systolic_bp_current",
    });
  }

  return evidence;
}

function getGenderLabel(locale: Locale, gender?: Gender) {
  if (gender === "male") {
    return locale === "vi" ? "nam" : "male";
  }
  if (gender === "female") {
    return locale === "vi" ? "nữ" : "female";
  }
  if (gender === "other") {
    return locale === "vi" ? "khác" : "other";
  }
  return null;
}
