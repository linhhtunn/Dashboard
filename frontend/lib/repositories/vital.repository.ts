import type { MetricSummary, VitalSignalSample } from "@/types";

type VitalDto = {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  hrv_rmssd: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
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
      heartRate: dto.heart_rate,
      hrvRmssd: dto.hrv_rmssd,
      systolicBp: dto.systolic_bp,
      diastolicBp: dto.diastolic_bp,
      spo2: dto.spo2,
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
  const response = await fetch(`/api/patients/${patientId}/vitals?range=${range}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as PatientVitalsDto;
}

export const vitalRepository = {
  async listByPatient(patientId: string, range = "15m"): Promise<VitalSignalSample[]> {
    const payload = await fetchVitalsPayload(patientId, range);
    return payload.samples.map(mapVital);
  },

  async listMetricSummaries(patientId: string, range = "15m"): Promise<MetricSummary[]> {
    const payload = await fetchVitalsPayload(patientId, range);
    return payload.metric_summaries.map(mapSummary);
  },
};
