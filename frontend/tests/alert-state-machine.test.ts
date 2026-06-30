import assert from "node:assert/strict";
import test from "node:test";

import { transitionAlertWorkflow } from "../lib/alerts/state-machine.ts";

test("critical noise requires doctor review", () => {
  assert.equal(transitionAlertWorkflow("acknowledged", "mark_noise", "critical"), "suspected_noise");
  assert.equal(transitionAlertWorkflow("suspected_noise", "doctor_confirm_noise", "critical"), "noise");
});

test("warning noise can be closed by coordinator", () => {
  assert.equal(transitionAlertWorkflow("acknowledged", "mark_noise", "warning"), "noise");
});

test("doctor confirmation is rejected before treatment", () => {
  assert.throws(
    () => transitionAlertWorkflow("acknowledged", "doctor_confirm", "critical"),
    /not allowed/,
  );
});

test("terminal states reject all mutations", () => {
  const actions = [
    "acknowledge",
    "nurse_treat",
    "needs_follow_up",
    "mark_noise",
    "doctor_confirm",
    "doctor_confirm_noise",
  ] as const;
  for (const action of actions) {
    assert.throws(() => transitionAlertWorkflow("doctor_confirmed", action, "critical"));
  }
});
