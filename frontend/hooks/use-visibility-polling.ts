"use client";

import { useEffect } from "react";

type VisibilityPollingOptions = {
  enabled?: boolean;
  intervalMs: number;
  runImmediately?: boolean;
};

export function useVisibilityPolling(
  callback: () => Promise<void> | void,
  {
    enabled = true,
    intervalMs,
    runImmediately = true,
  }: VisibilityPollingOptions,
) {
  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const run = () => {
      if (cancelled || inFlight || document.hidden) return;

      inFlight = true;
      Promise.resolve(callback())
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    };

    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const start = () => {
      stop();
      if (document.hidden) return;
      if (runImmediately) run();
      intervalId = window.setInterval(run, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    start();

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback, enabled, intervalMs, runImmediately]);
}
