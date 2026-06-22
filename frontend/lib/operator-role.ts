"use client";

import { useCallback, useEffect, useState } from "react";

import { operatorSessionRepository } from "@/lib/repositories/operator-session.repository";
import type { OperatorRole } from "@/types";

const STORAGE_KEY = "caresignal-operator-role";

export function getStoredOperatorRole(): OperatorRole {
  if (typeof window === "undefined") return "coordinator";
  const persona = window.localStorage.getItem("caresignal-clinical-persona");
  if (persona === "doctor") return "doctor";
  if (persona === "coordinator") return "coordinator";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "doctor" ? "doctor" : "coordinator";
}

export function useOperatorRole() {
  const [role, setRoleState] = useState<OperatorRole>("coordinator");
  const [sessionName, setSessionName] = useState<string | null>(null);

  useEffect(() => {
    setRoleState(getStoredOperatorRole());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void operatorSessionRepository
      .get(role)
      .then((session) => {
        if (!cancelled) setSessionName(session.name);
      })
      .catch(() => {
        if (!cancelled) setSessionName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const setRole = useCallback((next: OperatorRole) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
    window.dispatchEvent(new CustomEvent("operator-role-change", { detail: next }));
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<OperatorRole>).detail;
      if (detail) setRoleState(detail);
    };
    window.addEventListener("operator-role-change", onChange);
    return () => window.removeEventListener("operator-role-change", onChange);
  }, []);

  return { role, setRole, sessionName };
}

export async function operatorRoleHeaders(
  role: OperatorRole,
): Promise<HeadersInit> {
  try {
    const session = await operatorSessionRepository.get(role);
    return {
      "x-operator-role": session.role,
      "x-operator-id": session.actor_id,
      "x-operator-name": encodeURIComponent(session.name),
    };
  } catch {
    return { "x-operator-role": role };
  }
}
