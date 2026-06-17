import type { MetricSummary, VitalSignalSample } from "@/types";
import { clinicalApiGet } from "@/lib/api/client";
import { normalizePatientId } from "@/lib/patient-id";

type VitalDto = {
  patient_id: string;
  timestamp: string;
  heart_rate: number | null;
  respiratory_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
};

type MetricSummaryDto = {
  metric: MetricSummary["metric"];
  current_value: number;
  unit: MetricSummary["unit"];
  average_15m: number;
  trend: MetricSummary["trend"];
  change_pct: number;
  status: MetricSummary["status"];
};

type PatientVitalsDto = {
  patient_id: string;
  range: string;
  samples: VitalDto[];
  metric_summaries: MetricSummaryDto[];
};

function mapVital(dto: VitalDto): VitalSignalSample {
  return {
    patientId: dto.patient_id,
    timestamp: dto.timestamp,
    vitals: {
      heartRate: dto.heart_rate ?? undefined,
      respiratoryRate: dto.respiratory_rate ?? undefined,
      systolicBp: dto.systolic_bp ?? undefined,
      diastolicBp: dto.diastolic_bp ?? undefined,
      spo2: dto.spo2 ?? undefined,
    },
  };
}

function mapSummary(dto: MetricSummaryDto): MetricSummary {
  return {
    metric: dto.metric,
    currentValue: dto.current_value,
    unit: dto.unit,
    average15Min: dto.average_15m,
    trend: dto.trend,
    changePct: dto.change_pct,
    status: dto.status,
  };
}

async function fetchVitalsPayload(patientId: string, range = "15m") {
  const normalizedPatientId = normalizePatientId(patientId);
  return clinicalApiGet<PatientVitalsDto>(
    `/api/patients/${normalizedPatientId}/vitals?range=${range}`,
  );
}

export const vitalRepository = {
  async getSnapshot(patientId: string, range = "15m"): Promise<{
    samples: VitalSignalSample[];
    metricSummaries: MetricSummary[];
  }> {
    const payload = await fetchVitalsPayload(patientId, range);
    return {
      samples: payload.samples.map(mapVital),
      metricSummaries: payload.metric_summaries.map(mapSummary),
    };
  },

  async listByPatient(patientId: string, range = "15m"): Promise<VitalSignalSample[]> {
    const payload = await fetchVitalsPayload(patientId, range);
    return payload.samples.map(mapVital);
  },

  async listMetricSummaries(patientId: string, range = "15m"): Promise<MetricSummary[]> {
    const payload = await fetchVitalsPayload(patientId, range);
    return payload.metric_summaries.map(mapSummary);
  },
};
