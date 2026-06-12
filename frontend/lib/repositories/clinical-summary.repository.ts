import { clinicalApiGet } from "@/lib/api/client";

export type ClinicalSummary = {
  open_alert_count: number;
  critical_alert_count: number;
  patient_count: number;
  staff_on_duty_count: number;
  pending_doctor_confirm_count: number;
};

export const clinicalSummaryRepository = {
  async get(): Promise<ClinicalSummary> {
    return clinicalApiGet<ClinicalSummary>("/api/clinical/summary");
  },
};
