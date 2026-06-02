// -----------------------------
// i18n
// -----------------------------

export type Locale = "vi" | "en";

export interface LocalizedString {
  vi: string;
  en: string;
}

// -----------------------------
// shared primitives
// -----------------------------

export type ISODateString = string;

export interface Range {
  min: number;
  max: number;
}

export type TimeRange = "15m" | "30m" | "1h" | "6h";

// -----------------------------
// controlled vocabulary
// -----------------------------

export type UserRole = "clinician" | "admin";

export type Gender = "male" | "female" | "other";

export type PatientStatus =
  | "healthy"
  | "at_risk"
  | "critical"
  | "recent_symptom";

export type ActivityState =
  | "sleeping"
  | "sitting"
  | "standing"
  | "walking"
  | "exercise";

export type VitalMetric =
  | "heart_rate"
  | "hrv_rmssd"
  | "spo2"
  | "systolic_bp"
  | "diastolic_bp";

export type SignalUnit = "bpm" | "ms" | "%" | "mmHg";

export type Trend = "up" | "down" | "stable";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "high_heart_rate"
  | "low_heart_rate"
  | "low_oxygen"
  | "high_blood_pressure"
  | "low_blood_pressure"
  | "deterioration_risk"
  | "stroke_risk";

export type EvidenceKind =
  | "metric_threshold"
  | "trend_change"
  | "recent_alert"
  | "symptom_report"
  | "patient_context";

export type AISummaryStatus = "pending" | "ready" | "error";

export type AIConfidence = "low" | "medium" | "high";

export type DisclaimerKey = "ai_support_only";

export type ConditionCode = string;
export type SymptomCode = string;
export type WardCode = string;
export type DepartmentCode = string;
export type HospitalCode = string;

// -----------------------------
// lookup / taxonomy helpers
// -----------------------------

export interface CodeLabel {
  code: string;
  label: LocalizedString;
}

export type ActivityThresholdMap = Record<ActivityState, Range>;

export interface VitalThresholdProfile {
  metric: VitalMetric;
  unit: SignalUnit;
  thresholds: ActivityThresholdMap;
  notes?: string;
  referenceUrl?: string;
}

// -----------------------------
// domain entities
// -----------------------------

export interface MedicationCycle {
  medication: LocalizedString;
  dosage: string;
  schedule: LocalizedString;
  lastTakenAt: ISODateString | null;
  nextDoseAt: ISODateString | null;
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
  lastUpdated: ISODateString;
}

export interface VitalSignalSet {
  heartRate?: number;
  hrvRmssd?: number;
  spo2?: number;
  systolicBp?: number;
  diastolicBp?: number;
}

export interface VitalSignalSample {
  patientId: string;
  timestamp: ISODateString;
  activityState?: ActivityState;
  vitals: VitalSignalSet;
}

export interface MetricSummary {
  metric: VitalMetric;
  currentValue: number;
  displayValue?: string;
  unit: SignalUnit;
  average15Min?: number;
  trend: Trend;
  changePct?: number;
  status: PatientStatus;
}

export interface Evidence {
  kind: EvidenceKind;
  metric?: VitalMetric;
  conditionCode?: ConditionCode;
  symptomCode?: SymptomCode;
  alertType?: AlertType;
  value?: number;
  unit?: SignalUnit;
  timestamp?: ISODateString;
  comparisonValue?: number;
  comparisonWindow?: TimeRange;
  activityState?: ActivityState;
  noteKey?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  score?: number;
  evidence: Evidence[];
  timestamp: ISODateString;
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
  generatedAt: ISODateString;
  disclaimerKey: DisclaimerKey;
}

export interface Clinician {
  id: string;
  name: string;
  specialty: LocalizedString;
  onDuty: boolean;
  avatarUrl?: string;
}

export interface Hospital {
  id: string;
  code: HospitalCode;
  name: LocalizedString;
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
// endpoint-specific contracts
// -----------------------------

export type GetPatientsResponse = Patient[];

export type GetPatientByIdResponse = Patient;

export interface LatestMetricsResponse {
  patientId: string;
  metrics: MetricSummary[];
}

export interface GetPatientVitalsResponse {
  patientId: string;
  range: TimeRange;
  samples: VitalSignalSample[];
}

export type GetPatientAlertsResponse = Alert[];

export interface PatientSummarySnapshot {
  patientId: string;
  status: PatientStatus;
  keyMetrics: MetricSummary[];
  recentAlerts: Alert[];
  lastUpdated: ISODateString;
}

export type GetPatientSummaryResponse = PatientSummarySnapshot;

export interface AskAIRequest {
  patientId: string;
  locale: Locale;
  question: string;
}

export type AskAIResponse = AISummary;

// -----------------------------
// API contract
// -----------------------------

export interface HealthApi {
  getPatients(): Promise<GetPatientsResponse>;
  getPatientById(patientId: string): Promise<GetPatientByIdResponse>;
  getPatientLatest(patientId: string): Promise<LatestMetricsResponse>;
  getPatientVitals(
    patientId: string,
    range: TimeRange,
  ): Promise<GetPatientVitalsResponse>;
  getPatientAlerts(patientId: string): Promise<GetPatientAlertsResponse>;
  getPatientSummary(patientId: string): Promise<GetPatientSummaryResponse>;
  askAI(input: AskAIRequest): Promise<AskAIResponse>;
}

// -----------------------------
// frontend helper maps
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
