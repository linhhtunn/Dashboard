import type { Locale } from "@/types";

export type AgentFallbackKind =
  | "patient_not_found"
  | "safe_response"
  | "unavailable"
  | "generic";

export function classifyAgentAnswer(answer: string): AgentFallbackKind | null {
  const normalized = answer.toLowerCase();

  if (
    /mock patient fixture|patient fixture|khong tim thay mock|không tìm thấy mock/i.test(
      normalized,
    ) ||
    /patient_id nay|patient_id này|for this patient_id/i.test(normalized)
  ) {
    return "patient_not_found";
  }

  if (
    /phan hoi an toan|phản hồi an toàn|safe response|typed fallback/i.test(
      normalized,
    )
  ) {
    return "safe_response";
  }

  return null;
}

export function classifyAgentError(message: string): AgentFallbackKind {
  const normalized = message.toLowerCase();

  if (/patient|fixture|patient_id|mã bệnh nhân/i.test(normalized)) {
    return "patient_not_found";
  }

  if (/502|503|504|timeout|không thể kết nối|unable to reach|network/i.test(normalized)) {
    return "unavailable";
  }

  return "generic";
}

export function getAgentFallbackCopy(
  kind: AgentFallbackKind,
  locale: Locale,
  patientId?: string,
) {
  switch (kind) {
    case "patient_not_found":
      return {
        title:
          locale === "vi"
            ? "Chưa có dữ liệu agent cho mã bệnh nhân này"
            : "No agent data for this patient ID",
        description:
          locale === "vi"
            ? `Agent backend chưa có hồ sơ cho ${patientId ?? "mã này"}. Với môi trường HF/Supabase, hãy dùng MIMIC Subject ID (ví dụ 10003400, 10014354).`
            : `The agent backend has no record for ${patientId ?? "this ID"}. On HF/Supabase, use a MIMIC Subject ID (e.g. 10003400, 10014354).`,
        hint:
          locale === "vi"
            ? "Thử mở /patients/10003400 hoặc đổi AI_AGENT_BASE_URL trong .env.local."
            : "Try /patients/10003400 or update AI_AGENT_BASE_URL in .env.local.",
      };
    case "safe_response":
      return {
        title:
          locale === "vi"
            ? "Agent trả về phản hồi an toàn"
            : "Agent returned a safe fallback response",
        description:
          locale === "vi"
            ? "Yêu cầu chưa được xử lý đầy đủ (thiếu dữ liệu hoặc ngoài phạm vi). Vui lòng đổi câu hỏi hoặc kiểm tra patient_id."
            : "The request could not be fully processed (missing data or out of scope). Rephrase the question or verify patient_id.",
        hint:
          locale === "vi"
            ? "Chỉ hỗ trợ tham khảo lâm sàng — không thay thế chẩn đoán."
            : "Clinical decision support only — not a diagnosis.",
      };
    case "unavailable":
      return {
        title:
          locale === "vi"
            ? "Không kết nối được agent backend"
            : "Unable to reach the agent backend",
        description:
          locale === "vi"
            ? "Kiểm tra AI_AGENT_BASE_URL, mạng và trạng thái HF Space (có thể cần đợi cold start ~30s)."
            : "Check AI_AGENT_BASE_URL, network, and HF Space status (cold start may take ~30s).",
        hint:
          locale === "vi"
            ? "curl https://cuongnd03-health-app.hf.space/health"
            : "curl https://cuongnd03-health-app.hf.space/health",
      };
    default:
      return {
        title:
          locale === "vi"
            ? "Không thể lấy phản hồi AI"
            : "Unable to get an AI response",
        description:
          locale === "vi"
            ? "Đã xảy ra lỗi khi gọi agent. Thử lại sau vài giây."
            : "An error occurred while calling the agent. Try again in a few seconds.",
        hint: undefined,
      };
  }
}

export function shouldHideKeyFindings(answer: string, keyFindings: string[]) {
  if (!keyFindings.length) return true;
  if (classifyAgentAnswer(answer)) return true;
  if (/^#{1,3}\s/m.test(answer) || /\n[-*]\s+/m.test(answer)) {
    const bullets = answer
      .split("\n")
      .filter((line) => /^[-*]\s+/.test(line.trim()))
      .map((line) => line.replace(/^[-*]\s+/, "").trim());
    if (bullets.length === 0) return true;
    return keyFindings.some((finding) => /^#{1,3}\s/.test(finding.trim()));
  }
  return false;
}
