import "server-only";

import {
  getPatientDtoById,
  getPatientVitalsDto,
  listPatientAlerts,
  type AlertDto,
  type PatientDto,
  type PatientVitalsDto,
  type VitalDto,
} from "@/lib/server/patient-service";
import type { Locale } from "@/types";

type AgentDbVitalSummary = PatientVitalsDto["metric_summaries"][number];

export type AgentDbContext = {
  source: "care_signal_db";
  patient: PatientDto;
  latest_vital: VitalDto | null;
  metric_summaries: AgentDbVitalSummary[];
  recent_samples_5m: VitalDto[];
  recent_alerts: AlertDto[];
  generated_at: string;
};

export type AgentMockPatientContext = {
  id: string;
  name?: string;
  age?: number;
  gender?: PatientDto["gender"];
  wardLabel?: string;
  bed?: string;
  latestVitals?: {
    heartRate?: number;
    respiratoryRate?: number;
    spo2?: number;
    systolicBp?: number;
    diastolicBp?: number;
  };
  alerts?: Array<{
    type: string;
    severity: AlertDto["severity"];
  }>;
};

const AGENT_VITAL_RANGE = "1h";
const MAX_AGENT_SAMPLES = 12;
const MAX_AGENT_ALERTS = 5;

function pickLatestVital(vitals: PatientVitalsDto | null): VitalDto | null {
  if (!vitals?.samples.length) return null;

  const byMetric = new Map<string, AgentDbVitalSummary>(
    vitals.metric_summaries.map((summary) => [summary.metric, summary]),
  );
  const latestSample = vitals.samples[0];

  return {
    patient_id: latestSample.patient_id,
    timestamp: latestSample.timestamp,
    heart_rate:
      byMetric.get("heart_rate")?.current_value ?? latestSample.heart_rate,
    respiratory_rate:
      byMetric.get("respiratory_rate")?.current_value ??
      latestSample.respiratory_rate,
    systolic_bp:
      byMetric.get("systolic_bp")?.current_value ?? latestSample.systolic_bp,
    diastolic_bp:
      byMetric.get("diastolic_bp")?.current_value ?? latestSample.diastolic_bp,
    spo2: byMetric.get("spo2")?.current_value ?? latestSample.spo2,
  };
}

function localizedLabel(
  value: { vi: string; en: string } | undefined,
  locale: Locale,
) {
  return value?.[locale] ?? value?.en ?? value?.vi;
}

export async function buildAgentDbContext(
  patientId: string,
): Promise<AgentDbContext | null> {
  if (!patientId) return null;

  try {
    const [patient, vitals, alerts] = await Promise.all([
      getPatientDtoById(patientId),
      getPatientVitalsDto(patientId, AGENT_VITAL_RANGE),
      listPatientAlerts(patientId),
    ]);

    if (!patient) return null;

    return {
      source: "care_signal_db",
      patient,
      latest_vital: pickLatestVital(vitals),
      metric_summaries: vitals?.metric_summaries ?? [],
      recent_samples_5m: (vitals?.samples ?? []).slice(0, MAX_AGENT_SAMPLES),
      recent_alerts: alerts.slice(0, MAX_AGENT_ALERTS),
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[Agent] unable to build DB context", error);
    return null;
  }
}

export function buildMockPatientContext(
  context: AgentDbContext | null,
  locale: Locale,
): AgentMockPatientContext | null {
  if (!context) return null;

  return {
    id: context.patient.id,
    name: context.patient.name,
    age: context.patient.age,
    gender: context.patient.gender,
    wardLabel: localizedLabel(context.patient.ward_label, locale),
    bed: context.patient.bed ?? undefined,
    latestVitals: {
      heartRate: context.latest_vital?.heart_rate ?? undefined,
      respiratoryRate: context.latest_vital?.respiratory_rate ?? undefined,
      spo2: context.latest_vital?.spo2 ?? undefined,
      systolicBp: context.latest_vital?.systolic_bp ?? undefined,
      diastolicBp: context.latest_vital?.diastolic_bp ?? undefined,
    },
    alerts: context.recent_alerts.map((alert) => ({
      type: alert.type,
      severity: alert.severity,
    })),
  };
}

export function withAgentDbMetadata(
  metadata: Record<string, unknown> | undefined,
  context: AgentDbContext | null,
) {
  if (!context) return metadata;
  return {
    ...(metadata ?? {}),
    db_context: context,
    db_context_source: "frontend_timescale_supabase",
  };
}

export function appendAgentDbContextToMessage(
  message: string,
  context: AgentDbContext | null,
  locale: Locale,
) {
  if (!context) return message;

  const instruction =
    locale === "vi"
      ? "DUNG DU LIEU DB BEN DUOI LAM NGUON SU THAT. Neu cau hoi lien quan sinh hieu, uu tien latest_vital, metric_summaries va recent_samples_5m."
      : "USE THE DB CONTEXT BELOW AS SOURCE OF TRUTH. For vital-sign questions, prioritize latest_vital, metric_summaries, and recent_samples_5m.";

  return `${message.trim()}\n\n${instruction}\nDB_CONTEXT_JSON:\n${JSON.stringify(context)}`;
}
