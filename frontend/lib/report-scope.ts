"use client";

import { useCallback, useEffect, useState } from "react";

export type ReportAccessScope = "clinician" | "admin";

const STORAGE_KEY = "caresignal-report-scope";

export function getStoredReportScope(): ReportAccessScope {
  if (typeof window === "undefined") return "clinician";
  return window.localStorage.getItem(STORAGE_KEY) === "admin"
    ? "admin"
    : "clinician";
}

export function useReportScope() {
  const [scope, setScopeState] = useState<ReportAccessScope>("clinician");

  useEffect(() => {
    setScopeState(getStoredReportScope());
  }, []);

  const setScope = useCallback((next: ReportAccessScope) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setScopeState(next);
    window.dispatchEvent(
      new CustomEvent("report-scope-change", { detail: next }),
    );
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ReportAccessScope>).detail;
      if (detail) setScopeState(detail);
    };
    window.addEventListener("report-scope-change", onChange);
    return () => window.removeEventListener("report-scope-change", onChange);
  }, []);

  return { scope, setScope, isAdmin: scope === "admin" };
}
