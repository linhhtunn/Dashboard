import { PencilLine, ShieldCheck } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { Patient } from "@/types";

type PatientSummaryHeaderProps = {
  patient: Patient;
};

function getStatusLabel(status: Patient["status"]) {
  switch (status) {
    case "healthy":
      return "Khỏe mạnh";
    case "at_risk":
      return "Cần theo dõi";
    case "critical":
      return "Cần xử lý ngay";
    case "recent_symptom":
      return "Triệu chứng gần đây";
    default:
      return "Chưa xác định";
  }
}

function getGenderLabel(gender: Patient["gender"]) {
  switch (gender) {
    case "male":
      return "Nam";
    case "female":
      return "Nữ";
    case "other":
      return "Khác";
    default:
      return gender;
  }
}

export function PatientSummaryHeader({ patient }: PatientSummaryHeaderProps) {
  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <PanelCard className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(13,71,161,0.08)_0%,rgba(142,211,230,0.32)_100%)] text-[1.5rem] font-semibold text-[color:var(--cs-primary)]">
            {initials}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-[1.55rem] font-semibold leading-none text-[color:var(--cs-heading)]">
                {patient.name}
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:rgba(13,71,161,0.06)] text-[color:var(--cs-primary)] transition hover:bg-[color:rgba(13,71,161,0.12)]"
                aria-label="Chỉnh sửa bệnh nhân"
              >
                <PencilLine className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[1rem] text-[color:var(--cs-text-soft)]">
              MRN {patient.mrn} <span className="mx-1.5">&bull;</span>
              {patient.age} tuổi <span className="mx-1.5">&bull;</span>
              {getGenderLabel(patient.gender)}
            </p>
            <p className="mt-1 text-[1rem] text-[color:var(--cs-text-soft)]">
              {patient.wardLabel?.vi ?? patient.wardCode}
              <span className="mx-1.5">&bull;</span>
              Giường {patient.bed}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-[1rem] border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3.5 py-2 text-[color:var(--cs-teal)]">
            <ShieldCheck className="h-4.5 w-4.5" />
            <span className="text-[1rem] font-semibold">
              {getStatusLabel(patient.status)}
            </span>
          </div>
          <p className="mt-2 text-[0.92rem] text-[color:var(--cs-text-soft)]">
            Cập nhật 2 phút trước
          </p>
        </div>
      </div>
    </PanelCard>
  );
}
