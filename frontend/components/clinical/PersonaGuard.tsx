"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

import { useClinicalPersona } from "@/lib/clinical-persona";
import type { ClinicalPersona } from "@/types";

type PersonaGuardProps = {
  require: ClinicalPersona | ClinicalPersona[];
  children: ReactNode;
  redirectTo?: string;
};

export function PersonaGuard({
  require,
  children,
  redirectTo = "/patients",
}: PersonaGuardProps) {
  const router = useRouter();
  const { persona, personaReady } = useClinicalPersona();
  const allowed = useMemo(
    () => (Array.isArray(require) ? require : [require]),
    [require],
  );

  useEffect(() => {
    if (personaReady && !allowed.includes(persona)) {
      router.replace(redirectTo);
    }
  }, [allowed, persona, personaReady, redirectTo, router]);

  if (!personaReady) {
    return null;
  }

  if (!allowed.includes(persona)) {
    return null;
  }

  return <>{children}</>;
}
