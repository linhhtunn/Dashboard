import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProductionConfiguration,
  getAlertDispatchMode,
  isDemoModeAllowed,
} from "../lib/runtime-config.ts";

test("production disables demo mode", () => {
  const previous = process.env.CARESIGNAL_ENVIRONMENT;
  process.env.CARESIGNAL_ENVIRONMENT = "production";
  assert.equal(isDemoModeAllowed(), false);
  process.env.CARESIGNAL_ENVIRONMENT = previous;
});

test("dispatch defaults to shadow", () => {
  const previous = process.env.ALERT_DISPATCH_MODE;
  delete process.env.ALERT_DISPATCH_MODE;
  assert.equal(getAlertDispatchMode(), "shadow");
  process.env.ALERT_DISPATCH_MODE = previous;
});

test("production rejects live dispatch without PHI approval", () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    CARESIGNAL_ENVIRONMENT: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    AI_AGENT_BASE_URL: "https://ai.example.run.app",
    AI_MODE: "cdss",
    ALERT_DISPATCH_MODE: "live",
    PHI_PROCESSING_APPROVED: "false",
    APP_BASE_URL: "https://caresignal.example",
    CRON_SECRET: "cron-secret",
    HOSPITAL_ALERT_WEBHOOK_SECRET: "webhook-secret",
    HOSPITAL_ALERT_WEBHOOK_URL: "https://hospital.example/webhook",
  });
  assert.throws(assertProductionConfiguration, /PHI_PROCESSING_APPROVED/);
  process.env = previous;
});
