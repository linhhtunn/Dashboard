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
  healthy: { vi: "Ổn định", en: "Stable" },
  at_risk: { vi: "Cần theo dõi sát", en: "Close monitoring" },
  critical: { vi: "Cần can thiệp ngay", en: "Immediate intervention" },
  recent_symptom: { vi: "Triệu chứng mới", en: "New symptoms" },
};

const genderLabels: Record<Gender, LocalizedString> = {
  male: { vi: "Nam", en: "Male" },
  female: { vi: "Nữ", en: "Female" },
  other: { vi: "Khác", en: "Other" },
};

const metricLabels: Record<VitalMetric, LocalizedString> = {
  heart_rate: { vi: "Nhịp tim", en: "Heart rate" },
  respiratory_rate: { vi: "Nhịp thở", en: "Respiratory rate" },
  spo2: { vi: "SpO₂", en: "SpO₂" },
  systolic_bp: { vi: "Huyết áp tâm thu", en: "Systolic BP" },
  diastolic_bp: { vi: "Huyết áp tâm trương", en: "Diastolic BP" },
};

const alertSeverityLabels: Record<AlertSeverity, LocalizedString> = {
  info: { vi: "Theo dõi tiếp", en: "Continue monitoring" },
  warning: { vi: "Cần đánh giá", en: "Clinical review needed" },
  critical: { vi: "Ưu tiên can thiệp", en: "Urgent intervention" },
};

const alertTypeLabels: Record<AlertType, LocalizedString> = {
  high_heart_rate: {
    vi: "Nhịp tim vượt ngưỡng theo dõi",
    en: "Heart rate above monitoring threshold",
  },
  low_heart_rate: {
    vi: "Nhịp tim dưới ngưỡng theo dõi",
    en: "Heart rate below monitoring threshold",
  },
  low_oxygen: { vi: "SpO₂ thấp hơn mức cơ sở", en: "SpO₂ below baseline" },
  high_blood_pressure: {
    vi: "Huyết áp tâm thu cao",
    en: "Elevated systolic blood pressure",
  },
  low_blood_pressure: {
    vi: "Huyết áp tâm thu thấp",
    en: "Low systolic blood pressure",
  },
  deterioration_risk: {
    vi: "Nguy cơ diễn tiến bất lợi",
    en: "Risk of clinical deterioration",
  },
  stroke_risk: {
    vi: "Cần sàng lọc dấu hiệu thần kinh",
    en: "Neurological warning signs — review required",
  },
};

const conditionLabels: Record<string, LocalizedString> = {
  hypertension: { vi: "Tăng huyết áp", en: "Hypertension" },
  type_2_diabetes: { vi: "Đái tháo đường type 2", en: "Type 2 diabetes mellitus" },
  asthma: { vi: "Hen phế quản", en: "Asthma" },
  coronary_artery_disease: { vi: "Bệnh động mạch vành", en: "Coronary artery disease" },
  chronic_bronchitis: { vi: "Viêm phế quản mạn", en: "Chronic bronchitis" },
  ischemic_heart_disease: { vi: "Bệnh tim thiếu máu cục bộ", en: "Ischemic heart disease" },
  copd: { vi: "COPD", en: "COPD" },
  chronic_kidney_disease: { vi: "Bệnh thận mạn", en: "Chronic kidney disease" },
};

const symptomLabels: Record<string, LocalizedString> = {
  shortness_of_breath: { vi: "Khó thở", en: "Dyspnea" },
  chest_discomfort: { vi: "Khó chịu ngực", en: "Chest discomfort" },
  new_cough: { vi: "Ho mới", en: "New cough" },
  fatigue: { vi: "Mệt mỏi", en: "Fatigue" },
  dizziness: { vi: "Chóng mặt", en: "Dizziness" },
  palpitations: { vi: "Hồi hộp", en: "Palpitations" },
  confusion: { vi: "Lú lẫn", en: "Altered mental status" },
};

const wardLabels: Record<string, LocalizedString> = {
  cardiology_ward: { vi: "Khoa Tim mạch", en: "Cardiology" },
  general_ward: { vi: "Khoa Nội tổng quát", en: "General medicine" },
  icu: { vi: "Hồi sức tích cực", en: "Intensive care unit" },
  respiratory_ward: { vi: "Khoa Hô hấp", en: "Pulmonology" },
  stroke_unit: { vi: "Đơn vị Thần kinh", en: "Neurology unit" },
  observation: { vi: "Khu theo dõi ngắn hạn", en: "Short-stay observation" },
  endocrine_ward: { vi: "Khoa Nội tiết", en: "Endocrinology" },
  icu_3: { vi: "Hồi sức tích cực 3", en: "ICU — Ward 3" },
};

const departmentLabels: Record<string, LocalizedString> = {
  cardiology: { vi: "Tim mạch", en: "Cardiology" },
  internal_medicine: { vi: "Nội tổng quát", en: "Internal medicine" },
  emergency: { vi: "Cấp cứu", en: "Emergency medicine" },
  pulmonology: { vi: "Hô hấp", en: "Pulmonology" },
  endocrinology: { vi: "Nội tiết", en: "Endocrinology" },
  neurology: { vi: "Thần kinh", en: "Neurology" },
  general_medicine: { vi: "Đa khoa", en: "General medicine" },
  geriatrics: { vi: "Lão khoa", en: "Geriatrics" },
  critical_care: { vi: "Hồi sức", en: "Critical care" },
};

const zoneLabels: Record<string, LocalizedString> = {
  coordination: { vi: "Điều phối ca", en: "Shift coordination" },
  ward_wide: { vi: "Toàn khoa", en: "Ward-wide" },
  zone_a: { vi: "Khu A", en: "Zone A" },
  zone_b: { vi: "Khu B", en: "Zone B" },
  zone_c: { vi: "Khu C", en: "Zone C" },
  zone_d: { vi: "Khu D", en: "Zone D" },
};

const shiftBandLabels = {
  morning: { vi: "Ca sáng", en: "Day shift", hours: "06:00–14:00" },
  afternoon: { vi: "Ca chiều", en: "Evening shift", hours: "14:00–22:00" },
  night: { vi: "Ca đêm", en: "Night shift", hours: "22:00–06:00" },
} as const;

const shiftRoleLabels = {
  coordinator: { vi: "Điều dưỡng điều phối", en: "Shift coordinator" },
  floor_nurse: { vi: "Y tá lâm sàng", en: "Bedside nurse" },
  doctor: { vi: "Bác sĩ trực", en: "On-call physician" },
} as const;

const medicationLabels: Record<string, LocalizedString> = {
  amlodipine: { vi: "Amlodipine", en: "Amlodipine" },
  nitroglycerin: { vi: "Nitroglycerin", en: "Nitroglycerin" },
};

const scheduleLabels: Record<string, LocalizedString> = {
  daily_0800: { vi: "08:00 hằng ngày", en: "Daily at 08:00" },
  as_ordered: { vi: "Theo y lệnh", en: "As ordered" },
};

const evidenceNoteLabels: Record<string, LocalizedString> = {
  spo2_below_recent_baseline: {
    vi: "SpO₂ thấp hơn mức cơ sở gần đây",
    en: "SpO₂ below recent baseline",
  },
  systolic_bp_above_threshold: {
    vi: "Huyết áp tâm thu vượt ngưỡng cảnh báo",
    en: "Systolic BP above alert threshold",
  },
  spo2_below_resting_threshold: {
    vi: "SpO₂ thấp hơn ngưỡng nghỉ",
    en: "SpO₂ below resting threshold",
  },
  neurologic_symptom_reported: {
    vi: "Báo cáo triệu chứng thần kinh",
    en: "Neurologic symptom reported",
  },
};

const disclaimerLabels: Record<string, LocalizedString> = {
  ai_support_only: {
    vi: "Nội dung AI chỉ hỗ trợ tham khảo — quyết định lâm sàng do nhân viên y tế.",
    en: "AI output is for clinical decision support only.",
  },
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

export function getAlertSeverityLabel(severity: AlertSeverity, locale: Locale) {
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

export function getWardLabelByCode(code: string, locale: Locale) {
  return localizeText(wardLabels[code], locale, humanizeCode(code));
}

export function getWardLabel(patient: Patient, locale: Locale) {
  return localizeText(wardLabels[patient.wardCode] ?? patient.wardLabel, locale, patient.wardCode);
}

export function getDepartmentLabel(code: string, locale: Locale) {
  return localizeText(departmentLabels[code], locale, humanizeCode(code));
}

export function getZoneLabel(code: string, locale: Locale) {
  return localizeText(zoneLabels[code], locale, humanizeCode(code));
}

export function getShiftBandLabel(
  band: keyof typeof shiftBandLabels,
  locale: Locale,
) {
  return shiftBandLabels[band][locale];
}

export function getShiftBandHours(band: keyof typeof shiftBandLabels) {
  return shiftBandLabels[band].hours;
}

export function getShiftRoleLabel(
  role: keyof typeof shiftRoleLabels,
  locale: Locale,
) {
  return shiftRoleLabels[role][locale];
}

export function getMedicationLabel(code: string, locale: Locale) {
  return localizeText(medicationLabels[code], locale, humanizeCode(code));
}

export function getScheduleLabel(code: string, locale: Locale) {
  return localizeText(scheduleLabels[code], locale, code);
}

export function getEvidenceNoteLabel(noteKey: string, locale: Locale) {
  return localizeText(evidenceNoteLabels[noteKey], locale, humanizeCode(noteKey));
}

export function getDisclaimerLabel(key: string, locale: Locale) {
  return localizeText(disclaimerLabels[key], locale, key);
}

export function buildLocalizedPair(code: string, map: Record<string, LocalizedString>): LocalizedString {
  return map[code] ?? { vi: humanizeCode(code), en: humanizeCode(code) };
}

function humanizeCode(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      : `Updated ${diffMinutes} min ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  return locale === "vi"
    ? `Cập nhật ${diffHours} giờ trước`
    : `Updated ${diffHours} h ago`;
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
      : `${diffMinutes} min ago`;
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

export function formatMedicationDueTime(
  nextDoseAt: string | null,
  locale: Locale,
): string | null {
  if (!nextDoseAt) return null;
  const target = new Date(nextDoseAt).getTime();
  const diffMinutes = Math.round((target - Date.now()) / 60000);
  const clock = formatShortClockTime(nextDoseAt, locale);

  if (Math.abs(diffMinutes) < 90) {
    if (diffMinutes < 0) {
      const overdue = Math.abs(diffMinutes);
      return locale === "vi"
        ? `${clock} · quá ${overdue} phút`
        : `${clock} · ${overdue} min overdue`;
    }
    return locale === "vi"
      ? `${clock} · còn ${diffMinutes} phút`
      : `${clock} · in ${diffMinutes} min`;
  }

  return clock;
}
