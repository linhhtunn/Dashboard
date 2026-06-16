import type { AlertSeverity } from "@/types";

type AlertSeverityPresentation = {
  priorityRank: "P1" | "P2" | "P3";
  priorityLabel: Record<"vi" | "en", string>;
  badgeClasses: string;
  dotClass: string;
  cardClasses: string;
  railClass: string;
};

const alertSeverityPresentation: Record<AlertSeverity, AlertSeverityPresentation> = {
  critical: {
    priorityRank: "P1",
    priorityLabel: {
      vi: "Ưu tiên rất cao",
      en: "Immediate priority",
    },
    badgeClasses:
      "border-[color:rgba(229,72,77,0.28)] bg-[linear-gradient(135deg,rgba(229,72,77,0.16),rgba(255,255,255,0.92))] text-[color:var(--cs-danger)]",
    dotClass: "bg-[color:var(--cs-danger)]",
    cardClasses:
      "border-[color:rgba(229,72,77,0.18)] bg-[linear-gradient(180deg,rgba(229,72,77,0.08),rgba(255,255,255,0.92))]",
    railClass: "from-[rgba(229,72,77,0.92)] to-[rgba(229,72,77,0.24)]",
  },
  warning: {
    priorityRank: "P2",
    priorityLabel: {
      vi: "Ưu tiên theo dõi",
      en: "Watch priority",
    },
    badgeClasses:
      "border-[color:rgba(245,179,0,0.3)] bg-[linear-gradient(135deg,rgba(245,179,0,0.18),rgba(255,255,255,0.92))] text-[color:#9a6700]",
    dotClass: "bg-[color:var(--cs-gold)]",
    cardClasses:
      "border-[color:rgba(245,179,0,0.18)] bg-[linear-gradient(180deg,rgba(245,179,0,0.08),rgba(255,255,255,0.92))]",
    railClass: "from-[rgba(245,179,0,0.92)] to-[rgba(245,179,0,0.24)]",
  },
  info: {
    priorityRank: "P3",
    priorityLabel: {
      vi: "Ưu tiên thấp",
      en: "Low priority",
    },
    badgeClasses:
      "border-[color:rgba(13,71,161,0.24)] bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(255,255,255,0.92))] text-[color:var(--cs-primary)]",
    dotClass: "bg-[color:var(--cs-primary)]",
    cardClasses:
      "border-[color:rgba(13,71,161,0.16)] bg-[linear-gradient(180deg,rgba(13,71,161,0.06),rgba(255,255,255,0.92))]",
    railClass: "from-[rgba(13,71,161,0.92)] to-[rgba(13,71,161,0.22)]",
  },
};

export function getAlertSeverityPresentation(severity: AlertSeverity) {
  return alertSeverityPresentation[severity] ?? alertSeverityPresentation.info;
}
