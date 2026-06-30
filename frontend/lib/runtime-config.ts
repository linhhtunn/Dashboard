export type CareSignalEnvironment = "development" | "staging" | "production";
export type AlertDispatchMode = "shadow" | "live";
export type AiMode = "off" | "summary" | "cdss";

function enumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = value?.trim().toLowerCase();
  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

export function getCareSignalEnvironment(): CareSignalEnvironment {
  return enumValue(
    process.env.CARESIGNAL_ENVIRONMENT,
    ["development", "staging", "production"] as const,
    "development",
  );
}

export function isProductionEnvironment(): boolean {
  return getCareSignalEnvironment() === "production";
}

export function isDemoModeAllowed(): boolean {
  return !isProductionEnvironment() && process.env.ALLOW_DEMO_MODE !== "false";
}

export function getAlertDispatchMode(): AlertDispatchMode {
  return enumValue(
    process.env.ALERT_DISPATCH_MODE,
    ["shadow", "live"] as const,
    "shadow",
  );
}

export function getAiMode(): AiMode {
  return enumValue(process.env.AI_MODE, ["off", "summary", "cdss"] as const, "off");
}

export function isPhiProcessingApproved(): boolean {
  return process.env.PHI_PROCESSING_APPROVED === "true";
}

export function assertProductionConfiguration(): void {
  if (!isProductionEnvironment()) return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "AI_AGENT_BASE_URL",
    "AI_MODE",
    "ALERT_DISPATCH_MODE",
    "APP_BASE_URL",
    "CRON_SECRET",
    "HOSPITAL_ALERT_WEBHOOK_SECRET",
  ] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing production configuration: ${missing.join(", ")}`);
  }

  const aiBaseUrl = process.env.AI_AGENT_BASE_URL!.toLowerCase();
  if (aiBaseUrl.includes("hf.space")) {
    throw new Error("Hugging Face Spaces is not an approved production runtime.");
  }

  if (getAlertDispatchMode() === "live" && !isPhiProcessingApproved()) {
    throw new Error("Live alert dispatch requires PHI_PROCESSING_APPROVED=true.");
  }
  if (getAlertDispatchMode() === "live" && !process.env.HOSPITAL_ALERT_WEBHOOK_URL?.trim()) {
    throw new Error("Live alert dispatch requires HOSPITAL_ALERT_WEBHOOK_URL.");
  }
}
