"use client";

import {
  Clipboard,
  Database,
  Pause,
  Play,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import { VitalChart } from "@/components/vitals";
import type { VitalMetric, VitalSignalSample } from "@/types";

type Scenario = "normal" | "stroke" | "fall" | "spo2" | "custom";

const INITIAL_SIMULATION_TIMESTAMP = Date.parse("2026-01-01T00:00:55.000Z");

const scenarioLabels: Record<Scenario, { vi: string; en: string }> = {
  normal: { vi: "Bình thường", en: "Normal" },
  stroke: { vi: "Đột quỵ", en: "Stroke" },
  fall: { vi: "Té ngã", en: "Fall" },
  spo2: { vi: "Oxy máu giảm", en: "SpO2 drop" },
  custom: { vi: "Tùy chỉnh", en: "Custom" },
};

export default function MetricsPage() {
  const { locale } = useLocale();
  const [name, setName] = useState("Nguyễn Văn Demo");
  const [age, setAge] = useState("68");
  const [room, setRoom] = useState("SIM-01");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [metric, setMetric] = useState<VitalMetric>("heart_rate");
  const [patientId, setPatientId] = useState("SIM-P001");
  const [running, setRunning] = useState(false);
  const [samples, setSamples] = useState<VitalSignalSample[]>(() =>
    createInitialSamples("SIM-P001", INITIAL_SIMULATION_TIMESTAMP),
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSamples((current) => [
        ...current.slice(-19),
        createNextSample(patientId, scenario, current.at(-1)),
      ]);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [patientId, running, scenario]);

  const feedRows = useMemo(
    () =>
      samples
        .slice(-8)
        .reverse()
        .flatMap((sample) => [
          {
            timestamp: sample.timestamp,
            metric: "hr",
            value: sample.vitals.heartRate,
            unit: "bpm",
          },
          {
            timestamp: sample.timestamp,
            metric: "spo2",
            value: sample.vitals.spo2,
            unit: "%",
          },
        ]),
    [samples],
  );

  const createPatient = () => {
    const nextId = `SIM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setPatientId(nextId);
    setSamples(createInitialSamples(nextId));
  };

  return (
    <ClinicalShell
      eyebrow={locale === "vi" ? "Công cụ nội bộ" : "Internal tool"}
      title={locale === "vi" ? "Mô phỏng chỉ số" : "Metrics Simulator"}
      description={
        locale === "vi"
          ? "Tạo hồ sơ giả, chạy kịch bản và kiểm tra luồng dữ liệu đồng bộ mỗi 5 giây."
          : "Create a mock profile, run a scenario, and verify the 5-second data flow."
      }
    >
      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="dashboard-surface h-fit rounded-[1.15rem] p-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-teal)]">
            {locale === "vi" ? "Cấu hình bệnh nhân" : "Patient config"}
          </h2>

          <div className="mt-3 space-y-2.5">
            <Field label={locale === "vi" ? "Tên" : "Name"} value={name} onChange={setName} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={locale === "vi" ? "Tuổi" : "Age"} value={age} onChange={setAge} />
              <Field label={locale === "vi" ? "Phòng" : "Room"} value={room} onChange={setRoom} />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Kịch bản mô phỏng" : "Simulation scenario"}
            </p>
            <div className="mt-2 space-y-1.5">
              {(Object.keys(scenarioLabels) as Scenario[]).map((item) => (
                <label
                  key={item}
                  className="dashboard-input flex cursor-pointer items-center gap-2 rounded-[0.7rem] px-3 py-2 text-[12px]"
                >
                  <input
                    type="radio"
                    name="scenario"
                    checked={scenario === item}
                    onChange={() => setScenario(item)}
                    className="accent-[color:var(--cs-primary)]"
                  />
                  {scenarioLabels[item][locale]}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={createPatient}
              className="dashboard-input inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] text-[12px] font-semibold text-[color:var(--cs-primary)]"
            >
              <UserPlus className="h-4 w-4" />
              {locale === "vi" ? "Tạo bệnh nhân" : "Create patient"}
            </button>
            <button
              type="button"
              onClick={() => setRunning((current) => !current)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(13,71,161,0.18)]"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running
                ? locale === "vi"
                  ? "Dừng mô phỏng"
                  : "Stop sim"
                : locale === "vi"
                  ? "Bắt đầu mô phỏng"
                  : "Start sim"}
            </button>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <section className="dashboard-surface rounded-[1.15rem] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-teal)]">
                  {locale === "vi" ? "Trực quan hóa dữ liệu" : "Data visualization"}
                </p>
                <h2 className="mt-0.5 text-[1rem] font-semibold text-[color:var(--cs-heading)]">
                  {name} · {patientId}
                </h2>
              </div>
              <div className="flex gap-2">
                <select
                  value={metric}
                  onChange={(event) => setMetric(event.target.value as VitalMetric)}
                  className="dashboard-input h-9 rounded-[0.65rem] px-3 text-[11px]"
                >
                  <option value="heart_rate">{locale === "vi" ? "Nhịp tim" : "Heart rate"}</option>
                  <option value="spo2">{locale === "vi" ? "Oxy máu" : "SpO2"}</option>
                  <option value="systolic_bp">
                    {locale === "vi" ? "Huyết áp tâm thu" : "Systolic BP"}
                  </option>
                  <option value="diastolic_bp">
                    {locale === "vi" ? "Huyết áp tâm trương" : "Diastolic BP"}
                  </option>
                  <option value="respiratory_rate">
                    {locale === "vi" ? "Nhịp thở" : "Respiratory rate"}
                  </option>
                </select>
                <span className="dashboard-input inline-flex h-9 items-center rounded-[0.65rem] px-3 text-[11px] text-[color:var(--cs-text-soft)]">
                  {running
                    ? locale === "vi"
                      ? "Trực tiếp · 5 giây"
                      : "Live · 5s"
                    : locale === "vi"
                      ? "Đã dừng"
                      : "Stopped"}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <VitalChart data={samples} metric={metric} height={300} />
            </div>
          </section>

          <section className="dashboard-surface rounded-[1.15rem] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                  {locale === "vi" ? "Luồng dữ liệu thô" : "Raw data feed"}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(patientId)}
                  className="dashboard-input inline-flex h-8 items-center gap-1.5 rounded-[0.6rem] px-2.5 text-[10px] font-semibold"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  {locale === "vi" ? "Sao chép mã bệnh nhân" : "Copy patient_id"}
                </button>
                <button
                  type="button"
                  onClick={() => setSamples(createInitialSamples(patientId))}
                  className="dashboard-input inline-flex h-8 items-center gap-1.5 rounded-[0.6rem] px-2.5 text-[10px] font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {locale === "vi" ? "Đặt lại dữ liệu" : "Reset data"}
                </button>
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-[0.8rem] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.32))] font-mono text-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <div className="grid grid-cols-[1fr_90px_100px] border-b border-white/45 bg-[color:rgba(13,71,161,0.08)] px-3 py-2 font-semibold text-[color:var(--cs-heading)]">
                <span>{locale === "vi" ? "thời điểm" : "timestamp"}</span>
                <span>{locale === "vi" ? "chỉ số" : "metric"}</span>
                <span>{locale === "vi" ? "giá trị" : "value"}</span>
              </div>
              {feedRows.map((row, index) => (
                <div
                  key={`${row.timestamp}-${row.metric}-${index}`}
                  className="grid grid-cols-[1fr_90px_100px] border-b border-white/35 px-3 py-1.5 last:border-0"
                >
                  <span>{new Date(row.timestamp).toLocaleTimeString("vi-VN")}</span>
                  <span>{row.metric}</span>
                  <span>
                    {row.value ?? "--"} {row.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ClinicalShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="dashboard-input mt-1 h-10 w-full rounded-[0.7rem] px-3 text-[12px]"
      />
    </label>
  );
}

function createInitialSamples(patientId: string, anchorTimestamp = Date.now()) {
  const heartRates = [74, 76, 77, 76, 75, 75, 75, 78, 76, 75, 75, 75];
  return heartRates.map((heartRate, index) => ({
    patientId,
    timestamp: new Date(anchorTimestamp - (11 - index) * 5000).toISOString(),
    vitals: {
      heartRate,
      respiratoryRate: 15 + (index % 3),
      spo2: 97 + (index % 2),
      systolicBp: 120 + (index % 4),
      diastolicBp: 77 + (index % 3),
    },
  }));
}

function createNextSample(
  patientId: string,
  scenario: Scenario,
  previous?: VitalSignalSample,
  timestamp = Date.now(),
): VitalSignalSample {
  const previousVitals = previous?.vitals;
  const jitter = () => Math.round((Math.random() - 0.5) * 4);
  const base = {
    heartRate: previousVitals?.heartRate ?? 76,
    respiratoryRate: previousVitals?.respiratoryRate ?? 16,
    spo2: previousVitals?.spo2 ?? 98,
    systolicBp: previousVitals?.systolicBp ?? 122,
    diastolicBp: previousVitals?.diastolicBp ?? 78,
  };

  if (scenario === "stroke") {
    base.heartRate = Math.min(145, base.heartRate + 6);
    base.systolicBp = Math.min(190, base.systolicBp + 8);
  } else if (scenario === "fall") {
    base.heartRate = Math.min(130, base.heartRate + 10);
  } else if (scenario === "spo2") {
    base.spo2 = Math.max(84, base.spo2 - 1);
    base.heartRate = Math.min(115, base.heartRate + 2);
  } else {
    base.heartRate = Math.max(58, Math.min(95, base.heartRate + jitter()));
    base.spo2 = Math.max(96, Math.min(99, base.spo2 + Math.sign(jitter())));
    base.systolicBp = Math.max(110, Math.min(138, base.systolicBp + jitter()));
  }

  return {
    patientId,
    timestamp: new Date(timestamp).toISOString(),
    vitals: base,
  };
}
