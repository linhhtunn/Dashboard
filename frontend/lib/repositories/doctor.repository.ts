import { clinicalApiGet } from "@/lib/api/client";

export type DoctorOption = {
  user_id: string;
  display_name: string;
  email: string | null;
};

export const doctorRepository = {
  async list(): Promise<DoctorOption[]> {
    const payload = await clinicalApiGet<{ doctors: DoctorOption[] }>("/api/doctors");
    return payload.doctors;
  },
};
