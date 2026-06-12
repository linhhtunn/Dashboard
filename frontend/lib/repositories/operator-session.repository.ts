import { clinicalApiGet } from "@/lib/api/client";
import type { OperatorRole } from "@/types";

export type OperatorSession = {
  role: OperatorRole;
  actor_id: string;
  staff_id: string;
  name: string;
  zone_code: string | null;
};

export const operatorSessionRepository = {
  async get(role: OperatorRole): Promise<OperatorSession> {
    return clinicalApiGet<OperatorSession>(
      `/api/operator/session?role=${encodeURIComponent(role)}`,
    );
  },
};
