import assert from "node:assert/strict";
import test from "node:test";

import {
  isMissingSupabaseRelation,
  isWorkflowStorageErrorIgnorable,
} from "../lib/supabase/workflow-storage-error.ts";

test("recognizes a missing PostgREST schema-cache relation", () => {
  const error = {
    code: "PGRST205",
    message: "Could not find the table 'public.idempotency_keys' in the schema cache",
  };

  assert.equal(isMissingSupabaseRelation(error), true);
  assert.equal(isWorkflowStorageErrorIgnorable(error, true), true);
});

test("production never ignores missing workflow storage", () => {
  const error = {
    code: "PGRST205",
    message: "Could not find the table 'public.idempotency_keys' in the schema cache",
  };

  assert.equal(isWorkflowStorageErrorIgnorable(error, false), false);
});

test("demo mode ignores publishable-key RLS failures", () => {
  assert.equal(
    isWorkflowStorageErrorIgnorable(
      { code: "42501", message: "new row violates row-level security policy" },
      true,
    ),
    true,
  );
});
