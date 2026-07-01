"use client";

import { useCallback, useEffect, useState } from "react";

import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";
import { dedupedFetch } from "@/lib/api/request-cache";
import type { ClinicalPersona, RolePermissions, UserClinicalProfile } from "@/types";

const STORAGE_KEY = "caresignal-clinical-persona";

export function getStoredClinicalPersona(): ClinicalPersona {
  if (typeof window === "undefined") return "coordinator";
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "doctor" || value === "admin") return value;
  return "coordinator";
}

export type ClinicalOperatorRole = "coordinator" | "doctor";

export function toOperatorRole(persona: ClinicalPersona): ClinicalOperatorRole | null {
  if (persona === "admin") return null;
  return persona;
}

export function isClinicalOperator(
  persona: ClinicalPersona,
): persona is ClinicalOperatorRole {
  return persona === "coordinator" || persona === "doctor";
}

export function useClinicalPersona() {
  const [persona, setPersonaState] = useState<ClinicalPersona>("coordinator");
  const [profile, setProfile] = useState<UserClinicalProfile | null>(null);
  const [roleLocked, setRoleLocked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [personaReady, setPersonaReady] = useState(false);

  const syncPersona = useCallback((next: ClinicalPersona, locked: boolean) => {
    setPersonaState(next);
    setRoleLocked(locked);
    if (!locked) {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    if (next === "coordinator" || next === "doctor") {
      if (!locked) window.localStorage.setItem("caresignal-operator-role", next);
      window.dispatchEvent(new CustomEvent("operator-role-change", { detail: next }));
    }
    window.dispatchEvent(new CustomEvent("clinical-persona-change", { detail: next }));
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseAuthConfigured()) {
      syncPersona(getStoredClinicalPersona(), false);
      return;
    }

    setLoadingProfile(true);
    try {
      const payload = await dedupedFetch("clinical-persona-profile", async () => {
        const response = await fetchWithTimeout("/api/me/profile", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load clinical profile.");
        return (await response.json()) as {
          profile?: {
            user_id: string;
            role_code: ClinicalPersona;
            display_name: string | null;
            email: string | null;
            permissions: RolePermissions;
            role_label_vi: string;
            role_label_en: string;
          } | null;
        };
      });

      if (payload.profile?.role_code) {
        const mapped: UserClinicalProfile = {
          userId: payload.profile.user_id,
          roleCode: payload.profile.role_code,
          displayName: payload.profile.display_name,
          email: payload.profile.email,
          permissions: payload.profile.permissions,
          roleLabelVi: payload.profile.role_label_vi,
          roleLabelEn: payload.profile.role_label_en,
        };
        setProfile(mapped);
        syncPersona(mapped.roleCode, true);
        return;
      }
    } catch {
      // Fall back to demo persona picker when profile table is not migrated yet.
    } finally {
      setLoadingProfile(false);
    }

    syncPersona(getStoredClinicalPersona(), false);
  }, [syncPersona]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void loadProfile().finally(() => {
        if (!cancelled) setPersonaReady(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [loadProfile]);

  const setPersona = useCallback(
    (next: ClinicalPersona) => {
      if (roleLocked) return;
      syncPersona(next, false);
    },
    [roleLocked, syncPersona],
  );

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ClinicalPersona>).detail;
      if (detail) setPersonaState(detail);
    };
    window.addEventListener("clinical-persona-change", onChange);
    return () => window.removeEventListener("clinical-persona-change", onChange);
  }, []);

  const operatorRole = isClinicalOperator(persona) ? persona : "coordinator";

  return {
    persona,
    operatorRole,
    profile,
    roleLocked,
    loadingProfile,
    personaReady,
    setPersona,
    refreshProfile: loadProfile,
    isAdmin: persona === "admin",
    isDoctor: persona === "doctor",
    isCoordinator: persona === "coordinator",
    permissions: profile?.permissions ?? null,
  };
}

export function clinicalPersonaHeaders(persona: ClinicalPersona): HeadersInit {
  return { "x-clinical-persona": persona };
}
