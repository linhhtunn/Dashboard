import type { Patient, VitalSignalSample } from "@/types";
import type { PatientListItem } from "@/components/patients/patient-card";

type PatientDto = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: Patient["gender"];
  status: Patient["status"];
  ward_code: string;
  ward_label?: { vi: string; en: string };
  department_code?: string;
  department_label?: { vi: string; en: string };
  bed?: string | null;
  underlying_condition_codes: string[];
  medication_cycle: Array<{
    medication: { vi: string; en: string };
    dosage: string;
    schedule: { vi: string; en: string };
    last_taken_at: string | null;
    next_dose_at: string | null;
  }>;
  recent_symptom_codes: string[];
  last_updated: string;
};

type VitalDto = {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  hrv_rmssd: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
};

type PatientListItemDto = {
  patient: PatientDto;
  latest_vital: VitalDto | null;
  open_alert_count: number;
};

function mapPatient(dto: PatientDto): Patient {
  return {
    id: dto.id,
    mrn: dto.mrn,
    name: dto.name,
    age: dto.age,
    gender: dto.gender,
    status: dto.status,
    wardCode: dto.ward_code,
    wardLabel: dto.ward_label,
    departmentCode: dto.department_code,
    departmentLabel: dto.department_label,
    bed: dto.bed ?? undefined,
    underlyingConditionCodes: dto.underlying_condition_codes,
    medicationCycle: dto.medication_cycle.map((item) => ({
      medication: item.medication,
      dosage: item.dosage,
      schedule: item.schedule,
      lastTakenAt: item.last_taken_at,
      nextDoseAt: item.next_dose_at,
    })),
    recentSymptomCodes: dto.recent_symptom_codes,
    lastUpdated: dto.last_updated,
  };
}

function mapVital(dto: VitalDto | null): VitalSignalSample | null {
  if (!dto) return null;
  return {
    patientId: dto.patient_id,
    timestamp: dto.timestamp,
    vitals: {
      heartRate: dto.heart_rate,
      hrvRmssd: dto.hrv_rmssd,
      systolicBp: dto.systolic_bp,
      diastolicBp: dto.diastolic_bp,
      spo2: dto.spo2,
    },
  };
}

export const patientRepository = {
  async list(params?: {
    query?: string;
    status?: string;
  }): Promise<PatientListItem[]> {
    const search = new URLSearchParams();
    if (params?.query) search.set("query", params.query);
    if (params?.status && params.status !== "all") search.set("status", params.status);

    const response = await fetch(
      `/api/patients${search.toString() ? `?${search.toString()}` : ""}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as PatientListItemDto[];
    return payload.map((item) => ({
      patient: mapPatient(item.patient),
      latestVital: mapVital(item.latest_vital),
      openAlertCount: item.open_alert_count,
    }));
  },

  async findById(patientId: string): Promise<Patient | null> {
    const response = await fetch(`/api/patients/${patientId}`, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as PatientDto;
    return mapPatient(payload);
  },
};
