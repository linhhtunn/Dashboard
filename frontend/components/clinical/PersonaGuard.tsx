"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

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
  const { persona } = useClinicalPersona();
  const allowed = Array.isArray(require) ? require : [require];

  useEffect(() => {
    if (!allowed.includes(persona)) {
      router.replace(redirectTo);
    }
  }, [allowed, persona, redirectTo, router]);

  if (!allowed.includes(persona)) {
    return null;
  }

  return <>{children}</>;
}
