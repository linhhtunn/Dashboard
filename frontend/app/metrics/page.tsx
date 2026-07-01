"use client";

import {
  Activity,
  AlertTriangle,
  Clipboard,
  Database,
  Gauge,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  UserPlus,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PersonaGuard } from "@/components/clinical/PersonaGuard";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { VitalSignalSample } from "@/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ActivityState =
  | "resting"
  | "sitting"
  | "standing"
  | "walking"
  | "vigorous_activity"
  | "sleep";

type AbnormalType =
  | "tachycardia"
  | "bradycardia"
  | "hypertension_episode"
  | "spo2_drop"
  | "fall_event"
  | "afib_episode"
  | "stress_episode";

type RunStatus = "created" | "running" | "paused" | "stopped" | "completed" | "error";
type PatientMode = "sandbox" | "existing";

type ExistingPatientItem = {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    status: string;
    underlying_condition_codes: string[];
  };
};

type RawFeedRow = {
  stream: string;
  stream_name: string;
  timestamp?: string;
  message_id?: string;
  published: boolean;
  error?: string | null;
  payload: Record<string, unknown>;
};

type GroundTruthEvent = {
  event_id: string;
  episode_type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  severity?: string;
  status: string;
  expected_alert_type?: string;
};

type SimulatorSnapshot = {
  run_id: string;
  status: RunStatus;
  sim_time: string;
  current_second: number;
  current_activity: ActivityState;
  speed: number;
  duration_seconds?: number | null;
  publish_rabbitmq: boolean;
  patient_source: PatientMode;
  patient: {
    patient_id: string;
    patient_source: PatientMode;
    name: string;
    age: number;
    gender: string;
    lifestyle: string;
    health_status: string;
    risk_factors: string[];
  };
  baseline: {
    heart_rate: number;
    respiratory_rate: number;
    systolic_bp: number;
    diastolic_bp: number;
    spo2: number;
    ppi_resting_mean_ms: number;
    ppi_resting_std_ms: number;
    hrv_rmssd_morning: number;
  };
  active_abnormal?: {
    episode_type: string;
    remaining_seconds: number;
    severity?: string;
  } | null;
  samples: VitalSignalSample[];
  latest: {
    continuous?: Record<string, unknown> | null;
    motion_batch?: Record<string, unknown> | null;
    ppi_batch?: Record<string, unknown> | null;
    bp_triggered?: Record<string, unknown> | null;
    spo2_triggered?: Record<string, unknown> | null;
    steps_event?: Record<string, unknown> | null;
    stress?: Record<string, unknown> | null;
    panels: {
      ppi: {
        ppi_intervals_ms: number[];
        rmssd?: number | null;
        mean_ms?: number | null;
        irregularity?: number | null;
        preview_intervals_ms: number[];
        preview_rmssd?: number | null;
        preview_mean_ms?: number | null;
        preview_irregularity?: number | null;
        next_patch_in_seconds?: number;
        window_seconds?: number;
      };
      motion: {
        acc_magnitude_max?: number | null;
        gyro_magnitude_max?: number | null;
        fall_spike: boolean;
      };
      activity: {
        activity_type: string;
        steps_today: number;
        stress_score: number;
        stress_level: string;
      };
    };
  };
  raw_feed: RawFeedRow[];
  ground_truth: {
    active?: SimulatorSnapshot["active_abnormal"];
    events: GroundTruthEvent[];
  };
  errors: Array<{ timestamp: string; stream: string; error: string }>;
};

const activityOptions: ActivityState[] = [
  "resting",
  "sitting",
  "standing",
  "walking",
  "vigorous_activity",
  "sleep",
];

const abnormalOptions: AbnormalType[] = [
  "tachycardia",
  "bradycardia",
  "hypertension_episode",
  "spo2_drop",
  "fall_event",
  "afib_episode",
  "stress_episode",
];
const abnormalRecommendedDurations: Record<AbnormalType, number> = {
  tachycardia: 300,
  bradycardia: 300,
  hypertension_episode: 600,
  spo2_drop: 180,
  fall_event: 30,
  afib_episode: 300,
  stress_episode: 480,
};

const vitalSeriesOptions = [
  { key: "heart_rate", label: "HR", unit: "bpm", color: "#0d47a1" },
  { key: "spo2", label: "SpO2", unit: "%", color: "#e5484d" },
  { key: "systolic_bp", label: "SYS BP", unit: "mmHg", color: "#f5b300" },
  { key: "diastolic_bp", label: "DIA BP", unit: "mmHg", color: "#8ed3e6" },
] as const;

type VitalSeriesKey = (typeof vitalSeriesOptions)[number]["key"];

const respirationStressSeries = [
  { key: "respiratory_rate", label: "RR", unit: "rpm", color: "#009688" },
  { key: "stress_score", label: "Stress", unit: "score", color: "#7c3aed" },
] as const;

const normalizedEventSeries = [
  { key: "heart_rate_score", label: "HR", color: "#2563eb" },
  { key: "spo2_score", label: "SpO2", color: "#dc2626" },
  { key: "blood_pressure_score", label: "BP", color: "#d97706" },
  { key: "respiratory_score", label: "RR", color: "#0f766e" },
  { key: "stress_score_norm", label: "Stress", color: "#7c3aed" },
  { key: "motion_score", label: "Motion", color: "#111827" },
  { key: "ppi_irregularity_score", label: "PPI", color: "#be185d" },
] as const;

const riskFactorOptions = [
  "arrhythmia_risk",
  "heart_disease_risk",
  "hypertension_risk",
  "low_spo2_risk",
  "fall_risk",
  "afib_risk",
  "diabetes_risk",
  "anemia_risk",
];

export default function MetricsPage() {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<SimulatorSnapshot | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [patientMode, setPatientMode] = useState<PatientMode>("sandbox");
  const [existingPatients, setExistingPatients] = useState<ExistingPatientItem[]>([]);
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState("");
  const [name, setName] = useState("Realtime Demo Patient");
  const [patientId, setPatientId] = useState("");
  const [age, setAge] = useState("68");
  const [gender, setGender] = useState("male");
  const [pregnancyStatus, setPregnancyStatus] = useState("none");
  const [lifestyle, setLifestyle] = useState("low_activity");
  const [healthStatus, setHealthStatus] = useState("WARNING");
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityState>("resting");
  const [speed, setSpeed] = useState("1");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [publishRabbit, setPublishRabbit] = useState(false);
  const [, setPublishTouched] = useState(false);
  const [visibleVitals, setVisibleVitals] = useState<Record<VitalSeriesKey, boolean>>({
    heart_rate: true,
    spo2: true,
    systolic_bp: true,
    diastolic_bp: true,
  });
  const [abnormalType, setAbnormalType] = useState<AbnormalType>("fall_event");
  const [abnormalDuration, setAbnormalDuration] = useState(String(abnormalRecommendedDurations.fall_event));

  const samples = useMemo(() => snapshot?.samples ?? [], [snapshot?.samples]);
  const status = snapshot?.status ?? "created";
  const panels = snapshot?.latest.panels;
  const ppiPanel = panels?.ppi;
  const latestPpi = ppiPanel?.ppi_intervals_ms ?? [];
  const previewPpi = ppiPanel?.preview_intervals_ms ?? [];
  const publishPatientMode = snapshot?.patient_source ?? patientMode;
  const canPublishRabbit = publishPatientMode === "existing";
  const selectedExistingPatient = useMemo(
    () => existingPatients.find((item) => item.patient.id === selectedExistingPatientId) ?? existingPatients[0],
    [existingPatients, selectedExistingPatientId],
  );

  function applyExistingPatient(item: ExistingPatientItem) {
    setPatientId(item.patient.id);
    setName(item.patient.name);
    setAge(String(item.patient.age || 68));
    setGender(simulatorGender(item.patient.gender));
    setPregnancyStatus("none");
    setLifestyle("low_activity");
    setHealthStatus(healthStatusFromPatientStatus(item.patient.status));
    setRiskFactors(riskFactorsFromConditions(item.patient.underlying_condition_codes));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/patients?status=all", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Cannot load patients"))))
      .then((payload: ExistingPatientItem[]) => {
        if (cancelled) return;
        setExistingPatients(payload);
        setSelectedExistingPatientId((current) => current || payload[0]?.patient.id || "");
      })
      .catch(() => {
        if (!cancelled) setExistingPatients([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (patientMode !== "existing" || !selectedExistingPatient) return;
    const timeout = window.setTimeout(() => applyExistingPatient(selectedExistingPatient), 0);
    return () => window.clearTimeout(timeout);
  }, [patientMode, selectedExistingPatient]);

  useEffect(() => {
    if (!runId || (status !== "running" && status !== "paused")) return;
    const targetRunId = runId;
    const timer = window.setInterval(() => {
      void simulatorApi<SimulatorSnapshot>(`runs/${targetRunId}/snapshot`)
        .then((next) => {
          setSnapshot(next);
          setError(null);
        })
        .catch((requestError) => {
          setError(errorMessage(requestError));
        });
    }, status === "running" ? 800 : 1500);
    return () => window.clearInterval(timer);
  }, [runId, status]);

  const baseline = useMemo(() => snapshot?.baseline, [snapshot]);
  const latestContinuous = snapshot?.latest.continuous;
  const latestMotion = snapshot?.latest.motion_batch;
  const latestBp = snapshot?.latest.bp_triggered;
  const latestSpo2 = snapshot?.latest.spo2_triggered;
  const vitalChartData = useMemo(
    () => buildVitalChartData(samples, snapshot?.raw_feed ?? []),
    [samples, snapshot?.raw_feed],
  );
  const motionChartData = useMemo(
    () => buildMotionChartData(snapshot?.raw_feed ?? []),
    [snapshot?.raw_feed],
  );
  const ppiChartData = useMemo(
    () => buildPpiChartData(snapshot?.raw_feed ?? [], ppiPanel),
    [snapshot?.raw_feed, ppiPanel],
  );
  const normalizedChartData = useMemo(
    () => buildNormalizedEventChartData(vitalChartData, motionChartData, ppiChartData),
    [motionChartData, ppiChartData, vitalChartData],
  );
  const activeAbnormal = snapshot?.active_abnormal ?? null;
  const normalizedVisibleSeries = useMemo(() => normalizedSeriesForAbnormal(activeAbnormal), [activeAbnormal]);

  function toggleVitalSeries(key: VitalSeriesKey) {
    setVisibleVitals((current) => ({ ...current, [key]: !current[key] }));
  }

  async function createRun() {
    setLoading(true);
    setError(null);
    try {
      const existingPatient = patientMode === "existing" ? selectedExistingPatient : null;
      if (patientMode === "existing" && !existingPatient) {
        throw new Error("Choose an existing patient before creating a publishable run.");
      }
      const patientPayload = existingPatient
        ? patientPayloadFromExisting(existingPatient)
        : {
            name,
            patient_id: patientId || null,
            age: Number(age) || 68,
            gender,
            pregnancy_status: pregnancyStatus,
            lifestyle,
            health_status: healthStatus,
            risk_factors: riskFactors,
          };
      const created = await createRunPayload({
        ...patientPayload,
        patient_source: patientMode,
        activity,
        speed: Number(speed) || 5,
        duration_seconds: durationSeconds ? Number(durationSeconds) : null,
        publish_rabbitmq: patientMode === "existing" ? publishRabbit : false,
      });
      setSnapshot(created);
      setRunId(created.run_id);
      setPublishRabbit(created.publish_rabbitmq);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: string, method = "POST", body?: Record<string, unknown>) {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await simulatorApi<SimulatorSnapshot>(`runs/${runId}/${action}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      setSnapshot(next);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function updateActivity(nextActivity: ActivityState) {
    setActivity(nextActivity);
    if (!runId) return;
    await runAction("activity", "PATCH", { activity: nextActivity });
  }

  async function updateSpeed(nextSpeed: string) {
    setSpeed(nextSpeed);
    if (!runId) return;
    await runAction("speed", "PATCH", { speed: Number(nextSpeed) });
  }

  async function updatePublish(nextValue: boolean) {
    setPublishTouched(true);
    const activePublishMode = snapshot?.patient_source ?? patientMode;
    if (activePublishMode !== "existing") {
      setPublishRabbit(false);
      setError("Sandbox patient runs are local-only. Select an existing patient to publish RabbitMQ.");
      return;
    }
    setPublishRabbit(nextValue);
    if (!runId) return;
    await runAction("publish", "PATCH", { publish_rabbitmq: nextValue });
  }

  async function injectAbnormal() {
    const minimumDuration = abnormalRecommendedDurations[abnormalType];
    const requestedDuration = abnormalDuration ? Number(abnormalDuration) : minimumDuration;
    await runAction("abnormal", "POST", {
      episode_type: abnormalType,
      duration_seconds: Math.max(requestedDuration, minimumDuration),
    });
  }

  async function clearAbnormal() {
    await runAction("abnormal", "DELETE");
  }

  function updatePatientMode(nextMode: PatientMode) {
    setPatientMode(nextMode);
    if (nextMode === "sandbox") {
      setPublishTouched(true);
      setPublishRabbit(false);
      return;
    }
    if (selectedExistingPatient) {
      applyExistingPatient(selectedExistingPatient);
    }
  }

  function updateSelectedExistingPatient(nextPatientId: string) {
    setSelectedExistingPatientId(nextPatientId);
    const nextPatient = existingPatients.find((item) => item.patient.id === nextPatientId);
    if (nextPatient) applyExistingPatient(nextPatient);
  }

  return (
    <PersonaGuard require="admin">
      <ClinicalShell
      eyebrow={locale === "vi" ? "Cong cu noi bo" : "Internal tool"}
      title={locale === "vi" ? "Realtime Simulator" : "Realtime Simulator"}
      description={
        locale === "vi"
          ? "Dieu khien simulator that, quan sat sensor stream, ground truth va tuy chon publish RabbitMQ."
          : "Control the real simulator, inspect sensor streams, ground truth, and optional RabbitMQ publishing."
      }
    >
      <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="dashboard-surface h-fit rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                Patient profile
              </h2>
              <p className="mt-1 text-[11px] text-[color:var(--cs-text-soft)]">
                Baseline is generated by simulator logic.
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updatePatientMode("sandbox")}
                className={modeButtonClass(patientMode === "sandbox")}
              >
                Sandbox
              </button>
              <button
                type="button"
                onClick={() => updatePatientMode("existing")}
                className={modeButtonClass(patientMode === "existing")}
              >
                Existing
              </button>
            </div>

            {patientMode === "existing" ? (
              <SelectField
                label="Existing patient"
                value={selectedExistingPatientId}
                onChange={updateSelectedExistingPatient}
              >
                {existingPatients.length === 0 ? (
                  <option value="">No patients loaded</option>
                ) : (
                  existingPatients.map((item) => (
                    <option key={item.patient.id} value={item.patient.id}>
                      {item.patient.name} - {item.patient.id}
                    </option>
                  ))
                )}
              </SelectField>
            ) : (
              <>
                <Field label="Name" value={name} onChange={setName} />
                <Field label="Patient ID" value={patientId} onChange={setPatientId} placeholder="auto from run_id" />
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Age" value={age} onChange={setAge} type="number" disabled={patientMode === "existing"} />
              <SelectField
                label="Gender"
                value={gender}
                disabled={patientMode === "existing"}
                onChange={(value) => {
                  setGender(value);
                  if (value === "male") setPregnancyStatus("none");
                }}
              >
                <option value="male">male</option>
                <option value="female">female</option>
              </SelectField>
            </div>
            {gender === "female" && (
              <label className="dashboard-input flex min-h-9 items-center justify-between gap-3 rounded-lg px-3 text-[12px]">
                <span>Pregnant</span>
                <input
                  type="checkbox"
                  checked={pregnancyStatus === "pregnant"}
                  onChange={(e) => setPregnancyStatus(e.target.checked ? "pregnant" : "none")}
                  className="accent-[color:var(--cs-primary)]"
                />
              </label>
            )}
            <SelectField label="Lifestyle" value={lifestyle} onChange={setLifestyle} disabled={patientMode === "existing"}>
              <option value="very_active">very_active</option>
              <option value="moderately_active">moderately_active</option>
              <option value="low_activity">low_activity</option>
              <option value="sedentary">sedentary</option>
            </SelectField>
            <SelectField label="Health status" value={healthStatus} onChange={setHealthStatus} disabled={patientMode === "existing"}>
              <option value="NORMAL">NORMAL</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </SelectField>
            <div>
              <p className="text-[11px] font-semibold text-[color:var(--cs-text-soft)]">Risk factors</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {riskFactorOptions.map((item) => (
                  <label key={item} className="dashboard-input flex min-h-9 items-center gap-2 rounded-lg px-2 text-[10px]">
                    <input
                      type="checkbox"
                      checked={riskFactors.includes(item)}
                      disabled={patientMode === "existing"}
                      onChange={(event) => {
                        setRiskFactors((current) =>
                          event.target.checked
                            ? [...current, item]
                            : current.filter((value) => value !== item),
                        );
                      }}
                      className="accent-[color:var(--cs-primary)]"
                    />
                    <span className="break-all">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Speed" value={speed} onChange={(value) => void updateSpeed(value)}>
                <option value="1">x1</option>
                <option value="5">x5</option>
                <option value="10">x10</option>
                <option value="30">x30</option>
              </SelectField>
              <Field
                label="Duration sec"
                value={durationSeconds}
                onChange={setDurationSeconds}
                type="number"
                placeholder="until stop"
              />
            </div>

            <SelectField
              label="Activity"
              value={activity}
              onChange={(value) => void updateActivity(value as ActivityState)}
            >
              {activityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectField>

            <label className="dashboard-input flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-[12px]">
              <span>Publish RabbitMQ</span>
              <input
                type="checkbox"
                checked={canPublishRabbit && publishRabbit}
                disabled={!canPublishRabbit}
                onChange={(event) => void updatePublish(event.target.checked)}
                className="accent-[color:var(--cs-primary)]"
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <IconButton icon={UserPlus} label="Create run" onClick={() => void createRun()} disabled={loading} />
            <IconButton
              icon={status === "running" ? Pause : Play}
              label={status === "paused" ? "Resume" : status === "running" ? "Pause" : "Start"}
              onClick={() =>
                status === "running"
                  ? void runAction("pause")
                  : status === "paused"
                    ? void runAction("resume")
                    : void runAction("start")
              }
              primary
              disabled={!runId || loading}
            />
            <IconButton icon={Square} label="Stop" onClick={() => void runAction("stop")} disabled={!runId || loading} />
            <IconButton
              icon={RotateCcw}
              label="Reset"
              onClick={() => void runAction("reset")}
              disabled={!runId || loading}
            />
          </div>

          <div className="mt-4 rounded-lg border border-white/60 bg-white/50 p-3">
            <h3 className="text-[12px] font-semibold text-[color:var(--cs-heading)]">Inject abnormal</h3>
            <div className="mt-3 space-y-2">
              <SelectField
                label="Episode"
                value={abnormalType}
                onChange={(value) => {
                  const nextType = value as AbnormalType;
                  setAbnormalType(nextType);
                  setAbnormalDuration(String(abnormalRecommendedDurations[nextType]));
                }}
              >
                {abnormalOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Duration sec"
                value={abnormalDuration}
                onChange={setAbnormalDuration}
                type="number"
                min={abnormalRecommendedDurations[abnormalType]}
              />
              <div className="grid grid-cols-2 gap-2">
                <IconButton
                  icon={AlertTriangle}
                  label="Inject now"
                  onClick={() => void injectAbnormal()}
                  primary
                  disabled={!runId || loading}
                />
                <IconButton
                  icon={RotateCcw}
                  label="Clear"
                  onClick={() => void clearAbnormal()}
                  disabled={!runId || loading}
                />
              </div>
            </div>
          </div>

          {baseline ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <MiniStat label="Baseline heart rate" value={baseline.heart_rate} unit="bpm" />
              <MiniStat label="Baseline respiration" value={baseline.respiratory_rate} unit="rpm" />
              <MiniStat label="Baseline oxygen" value={baseline.spo2} unit="%" />
              <MiniStat label="Baseline blood pressure" value={`${baseline.systolic_bp}/${baseline.diastolic_bp}`} unit="mmHg" />
              <MiniStat label="PPI mean" value={baseline.ppi_resting_mean_ms} unit="ms" />
              <MiniStat label="Morning heart rate variability" value={baseline.hrv_rmssd_morning} unit="ms" />
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
              {error}
            </div>
          ) : null}

          <section className="dashboard-surface rounded-lg p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--cs-teal)]">Live vital overview</p>
                <h2 className="mt-1 text-[1rem] font-semibold text-[color:var(--cs-heading)]">
                  {snapshot?.patient.name ?? name} · {snapshot?.patient.patient_id ?? patientId}
                </h2>
                <p className="mt-1 text-[11px] text-[color:var(--cs-text-soft)]">
                  sim time {snapshot ? formatClock(snapshot.sim_time) : "--"} · second {snapshot?.current_second ?? 0}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {vitalSeriesOptions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleVitalSeries(item.key)}
                    className={[
                      "dashboard-input inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1 text-left text-[11px] font-semibold leading-tight",
                      visibleVitals[item.key] ? "text-[color:var(--cs-heading)]" : "opacity-45",
                    ].join(" ")}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => snapshot && void navigator.clipboard.writeText(snapshot.patient.patient_id)}
                  className="dashboard-input inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy patient_id
                </button>
              </div>
            </div>
            <div className="mt-3">
              <MultiSeriesChart
                data={vitalChartData}
                series={vitalSeriesOptions.filter((item) => visibleVitals[item.key])}
                height={300}
                baseline={baseline}
                activeAbnormal={isAbnormalForGroup(activeAbnormal, "vitals") ? activeAbnormal : null}
                emptyLabel="waiting for vital samples"
              />
            </div>
          </section>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="dashboard-surface rounded-lg p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                  Respiration / stress raw
                </h2>
              </div>
              <MultiSeriesChart
                data={vitalChartData}
                series={respirationStressSeries}
                height={220}
                baseline={baseline}
                activeAbnormal={isAbnormalForGroup(activeAbnormal, "respiration_stress") ? activeAbnormal : null}
                emptyLabel="waiting for respiration / stress samples"
              />
            </section>

            <section className="dashboard-surface rounded-lg p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                  Normalized event score
                </h2>
              </div>
              <MultiSeriesChart
                data={normalizedChartData}
                series={normalizedVisibleSeries}
                height={220}
                activeAbnormal={activeAbnormal}
                yDomain={[0, 1]}
                emptyLabel="waiting for event scores"
              />
            </section>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <Panel icon={Waves} title="PPI patch" active={isAbnormalForGroup(activeAbnormal, "ppi")}>
              <MetricLine label="Last patch" value={latestPpi.length ? `${latestPpi.length} beats` : "not emitted"} />
              <MetricLine label="Next patch" value={formatCountdown(ppiPanel?.next_patch_in_seconds)} />
              <MetricLine label="Mean PPI" value={formatValue(ppiPanel?.mean_ms, "ms")} />
              <MetricLine label="Irregularity" value={formatValue(ppiPanel?.irregularity)} />
              <p className="mt-2 break-all font-mono text-[10px] text-[color:var(--cs-text-soft)]">
                {latestPpi.slice(0, 10).join(", ") || "waiting for 15s ppi_batch"}
              </p>
            </Panel>
            <Panel icon={Waves} title="Heart rate variability preview" active={isAbnormalForGroup(activeAbnormal, "ppi")}>
              <MetricLine label="Patch RMSSD" value={formatValue(ppiPanel?.rmssd, "ms")} />
              <MetricLine label="Preview RMSSD" value={formatValue(ppiPanel?.preview_rmssd, "ms")} />
              <MetricLine label="Preview mean" value={formatValue(ppiPanel?.preview_mean_ms, "ms")} />
              <MetricLine label="Preview irregular" value={formatValue(ppiPanel?.preview_irregularity)} />
              <p className="mt-2 break-all font-mono text-[10px] text-[color:var(--cs-text-soft)]">
                {previewPpi.slice(0, 10).join(", ") || "preview starts after first tick"}
              </p>
            </Panel>
            <Panel icon={Activity} title="Motion" active={isAbnormalForGroup(activeAbnormal, "motion")}>
              <MetricLine label="Max acceleration" value={formatValue(panels?.motion.acc_magnitude_max, "g")} />
              <MetricLine label="Max gyroscope" value={formatValue(panels?.motion.gyro_magnitude_max, "rad/s")} />
              <MetricLine label="Fall spike" value={panels?.motion.fall_spike ? "yes" : "no"} />
              <MetricLine label="Points" value={motionPointCount(latestMotion)} />
            </Panel>
            <Panel icon={Gauge} title="Activity / Stress" active={isAbnormalForGroup(activeAbnormal, "respiration_stress")}>
              <MetricLine label="Activity" value={panels?.activity.activity_type ?? activity} />
              <MetricLine label="Steps today" value={panels?.activity.steps_today ?? 0} />
              <MetricLine label="Stress" value={panels?.activity.stress_score ?? "--"} />
              <MetricLine label="Level" value={panels?.activity.stress_level ?? "--"} />
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <section className="dashboard-surface rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[color:var(--cs-primary)]" />
                  <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">Raw feed</h2>
                </div>
                <span className="text-[11px] text-[color:var(--cs-text-soft)]">
                  {snapshot?.raw_feed.length ?? 0} recent messages
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-white/60 bg-white/50 font-mono text-[10px]">
                <div className="grid grid-cols-[110px_1fr_80px] bg-[color:rgba(13,71,161,0.08)] px-3 py-2 font-semibold text-[color:var(--cs-heading)]">
                  <span>time</span>
                  <span>stream / payload</span>
                  <span>publish</span>
                </div>
                {(snapshot?.raw_feed ?? []).slice(0, 12).map((row) => (
                  <div
                    key={`${row.message_id}-${row.stream}-${row.timestamp}`}
                    className="grid grid-cols-[110px_1fr_80px] gap-2 border-t border-white/50 px-3 py-2"
                  >
                    <span>{formatClock(row.timestamp)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[color:var(--cs-heading)]">{row.stream}</span>
                      <span className="block truncate text-[color:var(--cs-text-soft)]">{rawSummary(row)}</span>
                    </span>
                    <span className={row.published ? "text-emerald-600" : "text-[color:var(--cs-text-soft)]"}>
                      {row.published ? "sent" : "local"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-surface rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">Ground truth</h2>
              </div>
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-white/60 bg-white/50 p-3">
                  <MetricLine label="Active" value={snapshot?.active_abnormal?.episode_type ?? "none"} />
                  <MetricLine
                    label="Remaining"
                    value={
                      snapshot?.active_abnormal
                        ? `${snapshot.active_abnormal.remaining_seconds}s`
                        : "--"
                    }
                  />
                  <MetricLine label="Severity" value={snapshot?.active_abnormal?.severity ?? "--"} />
                </div>
                <div className="space-y-2">
                  {(snapshot?.ground_truth.events ?? []).slice(-5).reverse().map((event) => (
                    <div key={event.event_id} className="rounded-lg border border-white/60 bg-white/50 p-3 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[color:var(--cs-heading)]">{event.episode_type}</span>
                        <span className="text-[color:var(--cs-text-soft)]">{event.status}</span>
                      </div>
                      <p className="mt-1 text-[color:var(--cs-text-soft)]">
                        {formatClock(event.start_time)} {"->"} {formatClock(event.end_time)}
                      </p>
                      <p className="mt-1 text-[color:var(--cs-text-soft)]">
                        expected: {event.expected_alert_type ?? event.episode_type}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel icon={Database} title="Latest triggered">
              <MetricLine label="Blood pressure" value={bpSummary(latestBp)} />
              <MetricLine label="Oxygen saturation" value={spo2Summary(latestSpo2)} />
              <MetricLine label="Heart / respiration" value={continuousSummary(latestContinuous)} />
            </Panel>
            <Panel icon={AlertTriangle} title="Runtime errors">
              {(snapshot?.errors ?? []).length === 0 ? (
                <p className="text-[12px] text-[color:var(--cs-text-soft)]">No errors</p>
              ) : (
                snapshot?.errors.slice(-3).map((item) => (
                  <p key={`${item.timestamp}-${item.stream}`} className="text-[11px] text-red-700">
                    {item.stream}: {item.error}
                  </p>
                ))
              )}
            </Panel>
            <Panel icon={Radio} title="Run state">
              <MetricLine label="Run ID" value={snapshot?.run_id ?? "--"} />
              <MetricLine label="Patient mode" value={snapshot?.patient_source ?? patientMode} />
              <MetricLine label="RabbitMQ" value={snapshot?.publish_rabbitmq ? "enabled" : "disabled"} />
              <MetricLine label="Speed" value={`x${snapshot?.speed ?? speed}`} />
              <button
                type="button"
                onClick={() => snapshot && void navigator.clipboard.writeText(snapshot.run_id)}
                className="dashboard-input inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-[11px] font-semibold text-[color:var(--cs-primary)]"
                disabled={!snapshot}
              >
                <Clipboard className="h-3.5 w-3.5" />
                Copy run_id
              </button>
            </Panel>
          </div>
        </div>
      </div>
      </ClinicalShell>
    </PersonaGuard>
  );
}

async function createRunPayload(payload: Record<string, unknown>) {
  return simulatorApi<SimulatorSnapshot>("runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function simulatorApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/simulator/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail ?? payload.error ?? `Simulator request failed (${response.status})`;
    throw new Error(Array.isArray(detail) ? JSON.stringify(detail) : String(detail));
  }
  return payload as T;
}

function modeButtonClass(active: boolean) {
  return [
    "dashboard-input min-h-10 rounded-lg px-3 text-[12px] font-semibold transition",
    active ? "text-[color:var(--cs-primary)] ring-1 ring-[color:var(--cs-primary)]" : "text-[color:var(--cs-text-soft)]",
  ].join(" ");
}

function patientPayloadFromExisting(item: ExistingPatientItem) {
  return {
    name: item.patient.name,
    patient_id: item.patient.id,
    age: item.patient.age || 68,
    gender: simulatorGender(item.patient.gender),
    pregnancy_status: "none",
    lifestyle: "low_activity",
    health_status: healthStatusFromPatientStatus(item.patient.status),
    risk_factors: riskFactorsFromConditions(item.patient.underlying_condition_codes),
  };
}

function simulatorGender(value: string) {
  return value === "female" ? "female" : "male";
}

function healthStatusFromPatientStatus(status: string) {
  if (status === "critical") return "CRITICAL";
  if (status === "at_risk" || status === "recent_symptom") return "WARNING";
  return "NORMAL";
}

function riskFactorsFromConditions(conditions: string[]) {
  const normalized = conditions.map((item) => item.toLowerCase());
  const mapped = new Set<string>();
  for (const condition of normalized) {
    if (condition.includes("arrhythmia")) mapped.add("arrhythmia_risk");
    if (condition.includes("heart") || condition.includes("cardio")) mapped.add("heart_disease_risk");
    if (condition.includes("hypertension") || condition.includes("blood_pressure")) mapped.add("hypertension_risk");
    if (condition.includes("spo2") || condition.includes("oxygen") || condition.includes("copd")) mapped.add("low_spo2_risk");
    if (condition.includes("fall") || condition.includes("frailty")) mapped.add("fall_risk");
    if (condition.includes("afib") || condition.includes("atrial")) mapped.add("afib_risk");
    if (condition.includes("diabetes")) mapped.add("diabetes_risk");
    if (condition.includes("anemia")) mapped.add("anemia_risk");
  }
  return riskFactorOptions.filter((item) => mapped.has(item));
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[color:var(--cs-text-soft)]">{label}</span>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="dashboard-input mt-1 h-10 w-full rounded-lg px-3 text-[12px]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[color:var(--cs-text-soft)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="dashboard-input mt-1 h-10 w-full rounded-lg px-3 text-[12px]"
      >
        {children}
      </select>
    </label>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        primary
          ? "bg-[color:var(--cs-primary)] text-white shadow-[0_10px_22px_rgba(13,71,161,0.16)]"
          : "dashboard-input text-[color:var(--cs-primary)]",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const color =
    status === "running"
      ? "bg-emerald-50 text-emerald-700"
      : status === "paused"
        ? "bg-amber-50 text-amber-700"
        : status === "completed"
          ? "bg-blue-50 text-blue-700"
          : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>{status}</span>;
}

function MiniStat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="rounded-lg border border-white/60 bg-white/50 p-2">
      <p className="text-[10px] text-[color:var(--cs-text-soft)]">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-[color:var(--cs-heading)]">
        {value} {unit ? <span className="font-normal text-[color:var(--cs-text-soft)]">{unit}</span> : null}
      </p>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
  active = false,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <section
      className={[
        "dashboard-surface rounded-lg p-4 transition-colors",
        active ? "border border-red-200 bg-red-50/20" : "",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className={["h-4 w-4", active ? "text-red-600" : "text-[color:var(--cs-primary)]"].join(" ")} />
        <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-[color:var(--cs-text-soft)]">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-[color:var(--cs-heading)]">{value}</span>
    </div>
  );
}

type ChartPoint = {
  timestamp: string;
  timeLabel: string;
  [key: string]: number | string | null;
};

type ChartSeries = {
  key: string;
  label: string;
  unit?: string;
  color: string;
};

function MultiSeriesChart({
  data,
  series,
  height,
  baseline,
  activeAbnormal,
  emptyLabel,
  yDomain,
}: {
  data: ChartPoint[];
  series: readonly ChartSeries[];
  height: number;
  baseline?: SimulatorSnapshot["baseline"];
  activeAbnormal?: SimulatorSnapshot["active_abnormal"];
  emptyLabel: string;
  yDomain?: [number, number] | ["auto", "auto"];
}) {
  if (data.length === 0 || series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-white/60 bg-white/45 text-[12px] text-[color:var(--cs-text-soft)]"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-lg transition-colors",
        activeAbnormal ? "border border-red-200 bg-red-50/20 p-2" : "",
      ].join(" ")}
    >
      {activeAbnormal ? (
        <div className="mb-1 text-[11px] font-semibold text-red-600">
          Active: {abnormalLabel(activeAbnormal.episode_type)}
        </div>
      ) : null}
      <div className="w-full min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 20, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="rgba(13, 71, 161, 0.10)" vertical={false} />
            <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#718096" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#718096" }} width={42} domain={yDomain ?? ["auto", "auto"]} />
            <Tooltip content={<ChartTooltip series={series} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {baseline ? baselineReferenceLines(baseline, series) : null}
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string; color?: string; name?: string }>;
  label?: string;
  series: readonly ChartSeries[];
}) {
  if (!active || !payload?.length) return null;
  const orderedPayload = [...payload].sort((left, right) => {
    const leftIndex = series.findIndex((entry) => entry.key === left.dataKey);
    const rightIndex = series.findIndex((entry) => entry.key === right.dataKey);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  return (
    <div className="rounded-lg border border-white/70 bg-white/95 p-2 text-[11px] shadow-sm">
      <p className="mb-1 font-semibold text-[color:var(--cs-heading)]">{label}</p>
      <div className="space-y-1">
        {orderedPayload.map((item) => {
          const meta = series.find((entry) => entry.key === item.dataKey);
          return (
            <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
              <span style={{ color: item.color }}>{meta?.label ?? item.name}</span>
              <span className="font-semibold text-[color:var(--cs-heading)]">
                {item.value}
                {meta?.unit ? ` ${meta.unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function baselineReferenceLines(baseline: SimulatorSnapshot["baseline"], series: readonly ChartSeries[]) {
  const refs: Record<string, number> = {
    heart_rate: baseline.heart_rate,
    respiratory_rate: baseline.respiratory_rate,
    spo2: baseline.spo2,
    systolic_bp: baseline.systolic_bp,
    diastolic_bp: baseline.diastolic_bp,
  };
  return series
    .filter((item) => refs[item.key] !== undefined)
    .map((item) => (
      <ReferenceLine
        key={`baseline-${item.key}`}
        y={refs[item.key]}
        stroke={item.color}
        strokeOpacity={0.28}
        strokeDasharray="4 4"
      />
    ));
}

function buildVitalChartData(samples: VitalSignalSample[], rawFeed: RawFeedRow[]): ChartPoint[] {
  const byTime = new Map<string, ChartPoint>();

  for (const sample of samples) {
    const point = ensureChartPoint(byTime, sample.timestamp);
    point.heart_rate = numberOrNull(sample.vitals.heartRate);
    point.respiratory_rate = numberOrNull(sample.vitals.respiratoryRate);
    point.spo2 = numberOrNull(sample.vitals.spo2);
    point.systolic_bp = numberOrNull(sample.vitals.systolicBp);
    point.diastolic_bp = numberOrNull(sample.vitals.diastolicBp);
  }

  for (const row of rawFeed) {
    const timestamp = row.timestamp;
    if (!timestamp) continue;
    const point = ensureChartPoint(byTime, timestamp);
    if (row.stream_name === "wearable_continuous") {
      point.heart_rate = numberFromPayload(row.payload, "heart_rate") ?? point.heart_rate ?? null;
      point.respiratory_rate = numberFromPayload(row.payload, "respiratory_rate") ?? point.respiratory_rate ?? null;
      point.stress_score = numberFromPayload(row.payload, "stress_score") ?? point.stress_score ?? null;
    }
    if (row.stream_name === "wearable_spo2_triggered") {
      point.spo2 = numberFromPayload(row.payload, "spo2") ?? point.spo2 ?? null;
    }
    if (row.stream_name === "wearable_bp_triggered") {
      point.systolic_bp = numberFromPayload(row.payload, "systolic_bp") ?? point.systolic_bp ?? null;
      point.diastolic_bp = numberFromPayload(row.payload, "diastolic_bp") ?? point.diastolic_bp ?? null;
    }
    if (row.stream_name === "wearable_stress") {
      point.stress_score = numberFromPayload(row.payload, "stress_score") ?? point.stress_score ?? null;
    }
  }

  return sortChartPoints(byTime);
}

function buildMotionChartData(rawFeed: RawFeedRow[]): ChartPoint[] {
  const byTime = new Map<string, ChartPoint>();
  for (const row of rawFeed) {
    if (row.stream_name !== "wearable_motion_batch" || !row.timestamp) continue;
    const points = Array.isArray(row.payload.motion_points) ? row.payload.motion_points : [];
    const point = ensureChartPoint(byTime, row.timestamp);
    point.acc_magnitude = maxPointMagnitude(points, "acc");
    point.gyro_magnitude = maxPointMagnitude(points, "gyro");
  }
  return sortChartPoints(byTime);
}

function buildPpiChartData(rawFeed: RawFeedRow[], ppiPanel: SimulatorSnapshot["latest"]["panels"]["ppi"] | undefined): ChartPoint[] {
  const byTime = new Map<string, ChartPoint>();
  for (const row of rawFeed) {
    if (row.stream_name !== "wearable_ppi_batch" || !row.timestamp) continue;
    const values = Array.isArray(row.payload.ppi_intervals_ms)
      ? row.payload.ppi_intervals_ms.map((item) => Number(item)).filter((item) => Number.isFinite(item))
      : [];
    if (values.length === 0) continue;
    const point = ensureChartPoint(byTime, row.timestamp);
    point.ppi_mean_ms = round(mean(values), 1);
    point.rmssd = round(rmssd(values) ?? 0, 1);
    point.irregularity = round(irregularity(values), 3);
  }
  if (ppiPanel?.preview_intervals_ms?.length) {
    const timestamp = `preview-${Date.now()}`;
    const point = ensureChartPoint(byTime, timestamp);
    point.timeLabel = "preview";
    point.ppi_mean_ms = round(ppiPanel.preview_mean_ms ?? mean(ppiPanel.preview_intervals_ms), 1);
    point.rmssd = round(ppiPanel.preview_rmssd ?? rmssd(ppiPanel.preview_intervals_ms) ?? 0, 1);
    point.irregularity = round(ppiPanel.preview_irregularity ?? irregularity(ppiPanel.preview_intervals_ms), 3);
  }
  return sortChartPoints(byTime);
}

function buildNormalizedEventChartData(
  vitalData: ChartPoint[],
  motionData: ChartPoint[],
  ppiData: ChartPoint[],
): ChartPoint[] {
  const byTime = new Map<string, ChartPoint>();

  for (const row of vitalData) {
    const point = ensureChartPoint(byTime, row.timestamp);
    const heartRate = numberOrNull(row.heart_rate);
    const spo2 = numberOrNull(row.spo2);
    const systolic = numberOrNull(row.systolic_bp);
    const diastolic = numberOrNull(row.diastolic_bp);
    const respiratoryRate = numberOrNull(row.respiratory_rate);
    const stressScore = numberOrNull(row.stress_score);

    if (heartRate !== null) point.heart_rate_score = normalizeRange(heartRate, 40, 180);
    if (spo2 !== null) point.spo2_score = normalizeRange(spo2, 80, 100);
    if (systolic !== null || diastolic !== null) {
      point.blood_pressure_score = Math.max(
        systolic === null ? 0 : normalizeRange(systolic, 70, 190),
        diastolic === null ? 0 : normalizeRange(diastolic, 40, 120),
      );
    }
    if (respiratoryRate !== null) {
      point.respiratory_score = normalizeRange(respiratoryRate, 5, 40);
    }
    if (stressScore !== null) point.stress_score_norm = clamp01(stressScore / 100);
  }

  for (const row of motionData) {
    const point = ensureChartPoint(byTime, row.timestamp);
    const acc = numberOrNull(row.acc_magnitude);
    const gyro = numberOrNull(row.gyro_magnitude);
    point.motion_score = Math.max(acc === null ? 0 : clamp01(acc / 4), gyro === null ? 0 : clamp01(gyro / 8));
  }

  for (const row of ppiData) {
    const point = ensureChartPoint(byTime, row.timestamp);
    const ppiIrregularity = numberOrNull(row.irregularity);
    if (ppiIrregularity !== null) point.ppi_irregularity_score = clamp01(ppiIrregularity);
  }

  return sortChartPoints(byTime);
}

function ensureChartPoint(byTime: Map<string, ChartPoint>, timestamp: string) {
  const existing = byTime.get(timestamp);
  if (existing) return existing;
  const point: ChartPoint = { timestamp, timeLabel: formatClock(timestamp) };
  byTime.set(timestamp, point);
  return point;
}

function sortChartPoints(byTime: Map<string, ChartPoint>) {
  return Array.from(byTime.values()).sort((left, right) => {
    const leftTime = Date.parse(left.timestamp);
    const rightTime = Date.parse(right.timestamp);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return left.timestamp.localeCompare(right.timestamp);
    return leftTime - rightTime;
  });
}

function numberFromPayload(payload: Record<string, unknown>, key: string) {
  return numberOrNull(payload[key]);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function maxPointMagnitude(points: unknown[], prefix: "acc" | "gyro") {
  let maxValue: number | null = null;
  for (const rawPoint of points) {
    if (!rawPoint || typeof rawPoint !== "object") continue;
    const point = rawPoint as Record<string, unknown>;
    const existing = numberFromPayload(point, `${prefix}_magnitude`);
    const value = existing ?? vectorMagnitude(point, prefix);
    if (value !== null) maxValue = maxValue === null ? value : Math.max(maxValue, value);
  }
  return maxValue === null ? null : round(maxValue, 3);
}

function vectorMagnitude(point: Record<string, unknown>, prefix: "acc" | "gyro") {
  const x = numberFromPayload(point, `${prefix}_x`);
  const y = numberFromPayload(point, `${prefix}_y`);
  const z = numberFromPayload(point, `${prefix}_z`);
  if (x === null || y === null || z === null) return null;
  return Math.sqrt(x * x + y * y + z * z);
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function rmssd(values: number[]) {
  if (values.length < 2) return null;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    const diff = values[index] - values[index - 1];
    total += diff * diff;
  }
  return Math.sqrt(total / (values.length - 1));
}

function irregularity(values: number[]) {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return values.filter((value) => Math.abs(value - avg) >= avg * 0.15).length / values.length;
}

function normalizeRange(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, round(value, 3)));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

type AbnormalGroup = "vitals" | "respiration_stress" | "motion" | "ppi";

function isAbnormalForGroup(
  abnormal: SimulatorSnapshot["active_abnormal"] | null | undefined,
  group: AbnormalGroup,
) {
  const type = abnormal?.episode_type;
  if (!type) return false;
  if (group === "vitals") {
    return type === "tachycardia" || type === "bradycardia" || type === "hypertension_episode" || type === "spo2_drop";
  }
  if (group === "respiration_stress") return type === "stress_episode";
  if (group === "motion") return type === "fall_event";
  if (group === "ppi") return type === "afib_episode";
  return false;
}

function normalizedSeriesForAbnormal(abnormal: SimulatorSnapshot["active_abnormal"] | null | undefined) {
  const type = abnormal?.episode_type;
  const visibleKeys =
    type === "spo2_drop"
      ? ["spo2_score", "heart_rate_score", "blood_pressure_score"]
      : type === "hypertension_episode"
        ? ["blood_pressure_score", "heart_rate_score"]
        : type === "tachycardia" || type === "bradycardia"
          ? ["heart_rate_score", "respiratory_score"]
          : type === "fall_event"
            ? ["motion_score", "heart_rate_score"]
            : type === "afib_episode"
              ? ["ppi_irregularity_score", "heart_rate_score"]
              : type === "stress_episode"
                ? ["stress_score_norm", "respiratory_score", "heart_rate_score"]
                : ["heart_rate_score", "spo2_score", "blood_pressure_score", "motion_score", "ppi_irregularity_score"];
  return normalizedEventSeries.filter((item) => visibleKeys.includes(item.key));
}

function abnormalLabel(type: string) {
  const labels: Record<string, string> = {
    tachycardia: "High heart rate",
    bradycardia: "Low heart rate",
    hypertension_episode: "High blood pressure",
    spo2_drop: "Oxygen saturation drop",
    fall_event: "Fall motion event",
    afib_episode: "AFib / irregular PPI",
    stress_episode: "High stress",
  };
  return labels[type] ?? type;
}

function formatClock(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatValue(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function formatCountdown(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value <= 0 ? "now" : `${value}s`;
}

function rawSummary(row: RawFeedRow) {
  const payload = row.payload;
  if (row.stream_name === "wearable_continuous") {
    return `Heart rate ${payload.heart_rate ?? "--"} bpm, respiration ${payload.respiratory_rate ?? "--"} rpm`;
  }
  if (row.stream_name === "wearable_ppi_batch") {
    const intervals = Array.isArray(payload.ppi_intervals_ms) ? payload.ppi_intervals_ms.length : 0;
    return `${intervals} PPI intervals`;
  }
  if (row.stream_name === "wearable_motion_batch") {
    const points = Array.isArray(payload.motion_points) ? payload.motion_points.length : 0;
    return `${points} motion points`;
  }
  if (row.stream_name === "wearable_bp_triggered") {
    return `${payload.systolic_bp ?? "--"}/${payload.diastolic_bp ?? "--"} mmHg`;
  }
  if (row.stream_name === "wearable_spo2_triggered") {
    return `${payload.spo2 ?? "--"}%`;
  }
  return row.message_id ?? JSON.stringify(payload).slice(0, 80);
}

function motionPointCount(payload?: Record<string, unknown> | null) {
  const points = payload?.motion_points;
  return Array.isArray(points) ? points.length : "--";
}

function bpSummary(payload?: Record<string, unknown> | null) {
  if (!payload) return "--";
  return `${payload.systolic_bp ?? "--"}/${payload.diastolic_bp ?? "--"} mmHg`;
}

function spo2Summary(payload?: Record<string, unknown> | null) {
  if (!payload) return "--";
  return `${payload.spo2 ?? "--"}%`;
}

function continuousSummary(payload?: Record<string, unknown> | null) {
  if (!payload) return "--";
  return `${payload.heart_rate ?? "--"} bpm / ${payload.respiratory_rate ?? "--"} rpm`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected simulator error";
}
