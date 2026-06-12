import type {
  AlertSeverity,
  AlertType,
  Gender,
  Locale,
  LocalizedString,
  Patient,
  PatientStatus,
  VitalMetric,
} from "@/types";

export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_STORAGE_KEY = "care-signal-locale";

const intlLocaleMap: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
};

const patientStatusLabels: Record<PatientStatus, LocalizedString> = {
  healthy: { vi: "Khỏe mạnh", en: "Stable" },
  at_risk: { vi: "Cần theo dõi", en: "Needs monitoring" },
  critical: { vi: "Cần xử lý ngay", en: "Immediate attention" },
  recent_symptom: { vi: "Triệu chứng gần đây", en: "Recent symptoms" },
};

const genderLabels: Record<Gender, LocalizedString> = {
  male: { vi: "Nam", en: "Male" },
  female: { vi: "Nữ", en: "Female" },
  other: { vi: "Khác", en: "Other" },
};

const metricLabels: Record<VitalMetric, LocalizedString> = {
  heart_rate: { vi: "Nhịp tim", en: "Heart rate" },
  respiratory_rate: { vi: "Nhịp thở", en: "Respiratory rate" },
  spo2: { vi: "Oxy máu", en: "SpO₂" },
  systolic_bp: { vi: "Huyết áp tâm thu", en: "Systolic blood pressure" },
  diastolic_bp: {
    vi: "Huyết áp tâm trương",
    en: "Diastolic blood pressure",
  },
};

const alertSeverityLabels: Record<AlertSeverity, LocalizedString> = {
  info: { vi: "Tiếp tục theo dõi", en: "Continue monitoring" },
  warning: { vi: "Cần chú ý", en: "Needs attention" },
  critical: { vi: "Ưu tiên cao", en: "High priority" },
};

const alertTypeLabels: Record<AlertType, LocalizedString> = {
  high_heart_rate: {
    vi: "Nhịp tim cao hơn ngưỡng theo dõi",
    en: "Heart rate above monitoring threshold",
  },
  low_heart_rate: {
    vi: "Nhịp tim thấp hơn ngưỡng theo dõi",
    en: "Heart rate below monitoring threshold",
  },
  low_oxygen: { vi: "Oxy máu thấp hơn mức cơ sở", en: "SpO₂ below baseline" },
  high_blood_pressure: {
    vi: "Huyết áp cao hơn ngưỡng nghỉ",
    en: "Blood pressure above resting threshold",
  },
  low_blood_pressure: {
    vi: "Huyết áp thấp hơn ngưỡng nghỉ",
    en: "Blood pressure below resting threshold",
  },
  deterioration_risk: {
    vi: "Có dấu hiệu cần theo dõi diễn tiến",
    en: "Signs of possible deterioration",
  },
  stroke_risk: {
    vi: "Cần rà soát dấu hiệu thần kinh",
    en: "Review neurological warning signs",
  },
};

const conditionLabels: Record<string, LocalizedString> = {
  hypertension: { vi: "Tăng huyết áp", en: "Hypertension" },
  type_2_diabetes: { vi: "Đái tháo đường typ 2", en: "Type 2 diabetes" },
  asthma: { vi: "Hen phế quản", en: "Asthma" },
  coronary_artery_disease: {
    vi: "Bệnh mạch vành",
    en: "Coronary artery disease",
  },
  chronic_bronchitis: {
    vi: "Viêm phế quản mạn",
    en: "Chronic bronchitis",
  },
  ischemic_heart_disease: {
    vi: "Bệnh tim thiếu máu cục bộ",
    en: "Ischemic heart disease",
  },
  copd: { vi: "Bệnh phổi tắc nghẽn mạn tính", en: "COPD" },
  chronic_kidney_disease: {
    vi: "Bệnh thận mạn",
    en: "Chronic kidney disease",
  },
};

const symptomLabels: Record<string, LocalizedString> = {
  shortness_of_breath: { vi: "Khó thở nhẹ", en: "Mild shortness of breath" },
  chest_discomfort: { vi: "Khó chịu vùng ngực", en: "Chest discomfort" },
  new_cough: { vi: "Ho mới xuất hiện", en: "New cough" },
  fatigue: { vi: "Mệt mỏi", en: "Fatigue" },
  dizziness: { vi: "Chóng mặt", en: "Dizziness" },
  palpitations: { vi: "Đánh trống ngực", en: "Palpitations" },
  confusion: { vi: "Lú lẫn", en: "Confusion" },
};

const wardLabels: Record<string, LocalizedString> = {
  cardiology_ward: { vi: "Khoa Tim mạch", en: "Cardiology Ward" },
  general_ward: { vi: "Khoa Nội tổng quát", en: "General Internal Ward" },
  icu: { vi: "Hồi sức tích cực", en: "Intensive Care Unit" },
  respiratory_ward: { vi: "Khoa Hô hấp", en: "Respiratory Ward" },
  stroke_unit: { vi: "Đơn vị thần kinh", en: "Stroke Unit" },
  observation: { vi: "Khu theo dõi ngắn", en: "Observation Unit" },
  endocrine_ward: { vi: "Khoa Nội tiết", en: "Endocrinology Ward" },
};

export function localizeText(
  value: LocalizedString | string | undefined | null,
  locale: Locale,
  fallback = "",
) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[locale] || value.vi || value.en || fallback;
}

export function getIntlLocale(locale: Locale) {
  return intlLocaleMap[locale];
}

export function getPatientStatusLabel(status: PatientStatus, locale: Locale) {
  return localizeText(patientStatusLabels[status], locale, status);
}

export function getGenderLabel(gender: Gender, locale: Locale) {
  return localizeText(genderLabels[gender], locale, gender);
}

export function getMetricLabel(metric: VitalMetric, locale: Locale) {
  return localizeText(metricLabels[metric], locale, metric);
}

export function getAlertSeverityLabel(
  severity: AlertSeverity,
  locale: Locale,
) {
  return localizeText(alertSeverityLabels[severity], locale, severity);
}

export function getAlertTypeLabel(type: AlertType, locale: Locale) {
  return localizeText(alertTypeLabels[type], locale, type);
}

export function getConditionLabel(code: string, locale: Locale) {
  return localizeText(conditionLabels[code], locale, humanizeCode(code));
}

export function getSymptomLabel(code: string, locale: Locale) {
  return localizeText(symptomLabels[code], locale, humanizeCode(code));
}

export function getWardLabel(patient: Patient, locale: Locale) {
  const mapped = wardLabels[patient.wardCode];
  return localizeText(mapped ?? patient.wardLabel, locale, patient.wardCode);
}

export function formatRelativeUpdate(value: string, locale: Locale) {
  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );

  if (diffMinutes < 1) {
    return locale === "vi" ? "Vừa cập nhật" : "Updated just now";
  }

  if (diffMinutes < 60) {
    return locale === "vi"
      ? `Cập nhật ${diffMinutes} phút trước`
      : `Updated ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return locale === "vi"
    ? `Cập nhật ${diffHours} giờ trước`
    : `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
}

export function formatAlertTimestamp(timestamp: string, locale: Locale) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.max(
    0,
    Math.round((now.getTime() - date.getTime()) / 60000),
  );

  if (diffMinutes > 0 && diffMinutes < 60) {
    return locale === "vi"
      ? `${diffMinutes} phút trước`
      : `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const time = new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (date.toDateString() === now.toDateString()) {
    return locale === "vi" ? `Hôm nay · ${time}` : `Today · ${time}`;
  }

  return time;
}

export function formatShortClockTime(date: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

function humanizeCode(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
