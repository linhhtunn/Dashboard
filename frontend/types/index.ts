
// i18n
export type Locale = "vi" | "en";

export interface LocalizedString {
  vi: string;
  en: string;
}

// ---------- Enums / Unions ----------
export type Gender = 'male' | 'female' | 'other';
export type PatientStatus =
  | 'healthy'        // Healthy / Khỏe mạnh ổn định
  | 'at_risk'        // At Risk / Cần theo dõi
  | 'critical'       // Critical / Cần xử lý ngay
  | 'recent_symptom'; // Recent Symptom / Gần đây có triệu chứng


// CẦN XIN LẠI BE DANH SÁCH
export type VitalMetric =
  | 'heart_rate'
  | 'respiratory_rate'
  | 'blood_pressure'
  | 'spo2'           // NEW — oxygen saturation (flag #3)
  | 'glucose'
  | 'motion';

export type Trend = 'up' | 'down' | 'stable';

export type MotionStatus = 'still' | 'walking' | 'running' | 'fall_detected';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'fall'
  | 'high_blood_pressure'
  | 'low_blood_pressure'
  | "stroke"


export type AISummaryStatus = 'pending' | 'ready' | 'error';

export type AIConfidence = 'low' | 'medium' | 'high';

export type UserRole = "clinician" | "admin";
// ---------- Evidence ----------
export type EvidenceKind =
  | "metric_threshold"
  | "trend_change"
  | "recent_alert"
  | "symptom_report"
  | "patient_context";

export interface Evidence {
  kind: EvidenceKind;
  metric?: VitalMetric;
  conditionCode?: ConditionCode;
  symptomCode?: SymptomCode;
  alertType?: AlertType;
  value?: number;
  unit?: string;
  timestamp?: string;
  comparisonValue?: number;
  comparisonWindow?: "15m" | "30m" | "1h" | "6h";
  noteKey?: string;
}

// ---------- Medication ----------

export interface MedicationCycle {
  medication: string;
  dosage: string;
  schedule: string;
  lastTakenAt: string | null;
  nextDoseAt: string | null;
}

// ---------- Core entities ----------
export type ConditionCode = string;
export type SymptomCode = string;
export type WardCode = string;
export type DepartmentCode = string;
export type HospitalCode = string;

export interface CodeLabel {
  code: string;
  label: LocalizedString;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: Gender;
  status: PatientStatus;
  wardCode: WardCode;
  wardLabel?: LocalizedString;
  departmentCode?: DepartmentCode;
  departmentLabel?: LocalizedString;
  bed?: string;
  underlyingConditionCodes: ConditionCode[];
  medicationCycle: MedicationCycle[];
  recentSymptomCodes: SymptomCode[];
  lastUpdated: string;
}

//CHECK LẠI THEO LIST CỦA BE, CÓ THỂ CẦN THÊM HOẶC BỚT TRƯỜNG
export interface VitalSign {
  patientId: string;
  timestamp: string;
  heartRate: number;        // bpm
  respiratoryRate: number;  // rpm
  systolicBp: number;       // mmHg
  diastolicBp: number;      // mmHg
  spo2: number;             // % — NEW
  glucoseLevel: number;     // mg/dL
  motionStatus: MotionStatus;
}

export interface MetricSummary {
  metric: VitalMetric;
  currentValue: number;
  /** Chuỗi hiển thị khi 1 số không đủ, vd "118/76" cho BP (flag #4). */
  displayValue?: string;
  unit: string;
  average15Min: number;
  trend: Trend;
  /** % thay đổi so với 15 phút trước (UI: "↓ 4% vs 15 min ago"). */
  changePct?: number;
  status: PatientStatus;
}

export interface Alert {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  /** Điểm số mô hình (UI: "Score 8.4") — luôn kèm disclaimer, KHÔNG phải chẩn đoán (flag #5). */
  score?: number;
  evidence: Evidence[];
  timestamp: string;
  acknowledged: boolean;
}

export interface AISummary {
  patientId: string;
  locale: Locale;
  question: string;
  answer: string;
  keyFindings: string[];
  status: AISummaryStatus;
  confidence: AIConfidence;
  evidence: Evidence[];
  generatedAt: string;
  disclaimerKey: "ai_support_only";
}


// ---------- User / tenant ----------

export interface Clinician {
  id: string;
  name: string;            // "Dr. Linh Nguyen"
  specialty: string;       // "Cardiology"
  onDuty: boolean;
  avatarUrl?: string;
}

export interface Hospital {
  id: string;
  code: HospitalCode;
  name: LocalizedString; 
             // "Vinmec International Hospital"
}

// -----------------------------
// auth / session
// -----------------------------

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId: string;
  preferredLocale: Locale;
}

export interface SessionResponse {
  user: SessionUser;
}

export interface UpdatePreferencesRequest {
  preferredLocale: Locale;
}

export interface UpdatePreferencesResponse {
  success: boolean;
  preferredLocale: Locale;
}

// -----------------------------
// AI ask
// -----------------------------

export interface AskAIRequest {
  patientId: string;
  locale: Locale;
  question: string;
}

// -----------------------------
// optional frontend-only helpers
// -----------------------------

export interface StatusLabelMap {
  healthy: LocalizedString;
  at_risk: LocalizedString;
  critical: LocalizedString;
  recent_symptom: LocalizedString;
}

export interface DisclaimerMap {
  ai_support_only: LocalizedString;
}