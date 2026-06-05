"use client";

import type { ThreadMeta } from "@/lib/ai/types";

const THREAD_INDEX_STORAGE_KEY = "care-signal-thread-index";

export function createThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `thread-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function listThreadMeta(patientId: string): ThreadMeta[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(THREAD_INDEX_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as ThreadMeta[];
    return parsed
      .filter((item) => item.patientId === patientId)
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  } catch {
    return [];
  }
}

export function upsertThreadMeta(meta: ThreadMeta) {
  if (typeof window === "undefined") return;

  const current = listAllThreadMeta();
  const next = [meta, ...current.filter((item) => item.threadId !== meta.threadId)];
  window.localStorage.setItem(THREAD_INDEX_STORAGE_KEY, JSON.stringify(next));
}

function listAllThreadMeta(): ThreadMeta[] {
  const stored = window.localStorage.getItem(THREAD_INDEX_STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as ThreadMeta[];
  } catch {
    return [];
  }
}
