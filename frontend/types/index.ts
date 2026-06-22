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

export type TimeRange = "15m" | "30m" | "1h" | "3h" | "9h" | "1d" | "7d";

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
  | "respiratory_rate"
  | "spo2"
  | "systolic_bp"
  | "diastolic_bp";

export type SignalUnit = "bpm" | "rpm" | "%" | "mmHg";

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
  dbProfile?: PatientDbProfile;
}

export interface PatientBaselineSignals {
  heartRate?: number;
  respiratoryRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  spo2?: number;
  stressScore?: number;
  hrvRmssdMorning?: number;
  ecgRhythm?: string;
}

export interface PatientDbProfile {
  mimicSubjectId?: number | null;
  ageGroup?: string | null;
  pregnancyStatus?: string | null;
  lifestyle?: string | null;
  activityLevel?: string | null;
  medicalHistory?: string | null;
  healthStatus?: string | null;
  recordStatus?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  riskFactors: string[];
  baselineSignals?: PatientBaselineSignals;
  createdAt?: string | null;
}

export interface VitalSignalSet {
  heartRate?: number;
  respiratoryRate?: number;
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

export type AlertWorkflowStatus =
  | "open"
  | "nurse_treated"
  | "needs_follow_up"
  | "noise"
  | "doctor_confirmed";

export type OperatorRole = "coordinator" | "floor_nurse" | "doctor";

/** UI persona: coordinator nurse and doctor share clinical access; admin manages simulation & users. */
export type ClinicalPersona = "coordinator" | "doctor" | "admin";

export type RolePermissions = {
  clinical_access: boolean;
  record_treatment: boolean;
  confirm_alerts: boolean;
  simulation: boolean;
  manage_users: boolean;
};

export type UserClinicalProfile = {
  userId: string;
  roleCode: ClinicalPersona;
  displayName: string | null;
  email: string | null;
  permissions: RolePermissions;
  roleLabelVi: string;
  roleLabelEn: string;
};

export interface AlertTreatmentRecord {
  symptomsBefore: string;
  actionTaken: string;
  symptomsAfter: string;
  outcome: "completed" | "needs_follow_up";
  floorNurseId: string;
  floorNurseName: string;
  zoneCode: string;
  followUpNote?: string;
  recordedById: string;
  recordedByName: string;
  recordedAt: ISODateString;
  doctorConclusion?: string;
  doctorConfirmedAt?: ISODateString;
}

export interface AlertActionLogEntry {
  id: string;
  alertId: string;
  action: "nurse_treat" | "mark_noise" | "needs_follow_up" | "doctor_confirm";
  actorId: string;
  actorName: string;
  actorRole: OperatorRole;
  payload: Record<string, unknown>;
  createdAt: ISODateString;
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
  workflowStatus: AlertWorkflowStatus;
  assignedFloorNurseId?: string;
  assignedZoneCode?: string;
  assignedDoctorUserId?: string;
  noiseNote?: string;
  treatment?: AlertTreatmentRecord;
}

export type ShiftStaffRole = "coordinator" | "floor_nurse" | "doctor";

export type ShiftStaffStatus = "active" | "break" | "off";

export interface ShiftStaffMember {
  id: string;
  name: string;
  role: ShiftStaffRole;
  zoneCode: string;
  status: ShiftStaffStatus;
}

export type ShiftBand = "morning" | "afternoon" | "night";

export interface ShiftScheduleSlot {
  id: string;
  staffId: string;
  date: string;
  band: ShiftBand;
  zoneCode: string;
}

export interface Shift {
  id: string;
  wardCode: string;
  wardLabel: LocalizedString;
  startedAt: ISODateString;
  coordinatorId: string;
  staff: ShiftStaffMember[];
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
