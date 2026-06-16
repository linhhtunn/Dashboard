export type PatientSeed = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  status: string;
  ward_code: string;
  department_code: string;
  bed: string;
  underlying_condition_codes: string[];
  recent_symptom_codes: string[];
  last_updated: string;
  medications: Array<{
    medication_code: string;
    dosage: string;
    schedule_code: string;
    last_taken_at: string | null;
    next_dose_at: string | null;
  }>;
};

export type AlertSeed = {
  id: string;
  patient_id: string;
  type: string;
  severity: string;
  score?: number;
  timestamp: string;
  acknowledged: boolean;
  evidence: Array<Record<string, unknown>>;
};

export type VitalSeed = {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  respiratory_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
};

export type StaffSeed = {
  id: string;
  name: string;
  role: string;
  zone_code: string;
  status: string;
};

export type ShiftSeed = {
  id: string;
  ward_code: string;
  started_at: string;
  coordinator_id: string;
};

export type OperatorSessionSeed = {
  roles: Record<
    string,
    {
      actor_id: string;
      staff_id: string;
    }
  >;
};
