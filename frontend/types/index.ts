// ---------- Enums / Unions ----------

export type PatientStatus =
  | 'healthy'        // Healthy / Khỏe mạnh  (header có thể hiển thị "Stable")
  | 'at_risk'        // At Risk / Có nguy cơ
  | 'critical'       // Critical / Cần xử lý ngay
  | 'recent_symptom'; // Recent Symptom / Gần đây có triệu chứng

export type Gender = 'male' | 'female' | 'other';

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
  | 'abnormal_glucose'
  | 'high_heart_rate'
  | 'low_heart_rate'
  | 'abnormal_respiratory'
  | 'low_oxygen'          // NEW — Low Oxygen Saturation
  | 'deterioration_risk'; // NEW — framing an toàn cho "sepsis risk" (flag #5)

export type AISummaryStatus = 'pending' | 'ready' | 'error';

export type AIConfidence = 'low' | 'medium' | 'high';

// ---------- Evidence ----------

export interface Evidence {
  metric?: VitalMetric;
  value?: number;
  unit?: string;
  timestamp?: string;
  /** Wording an toàn: "dấu hiệu bất thường", "cần theo dõi thêm". */
  note: string;
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

export interface Patient {
  id: string;
  /** Medical Record Number (hiển thị ở header/list). */
  mrn: string;
  name: string;
  age: number;
  gender: Gender;
  status: PatientStatus;
  /** Phòng/khoa, vd "Cardiology Ward", "ICU". */
  ward: string;
  department?: string;
  /** Giường, vd "Bed 12A". */
  bed?: string;
  underlyingConditions: string[];
  medicationCycle: MedicationCycle[];
  recentSymptoms: string[];
  lastUpdated: string; // ISO 8601
}

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
  message: string;
  /** Điểm số mô hình (UI: "Score 8.4") — luôn kèm disclaimer, KHÔNG phải chẩn đoán (flag #5). */
  score?: number;
  evidence: Evidence[];
  timestamp: string;
  acknowledged: boolean;
}

export interface AISummary {
  patientId: string;
  question: string;
  answer: string;
  keyFindings: string[];
  status: AISummaryStatus;
  confidence: AIConfidence; // UI: "Confidence: High"
  evidence: Evidence[];     // bắt buộc — không trả lời tự do
  generatedAt: string;
  disclaimer: string;      
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
  name: string;            // "Vinmec International Hospital"
}