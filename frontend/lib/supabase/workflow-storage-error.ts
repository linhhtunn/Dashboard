export type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function isMissingSupabaseRelation(error: SupabaseErrorLike | string): boolean {
  const code = typeof error === "string" ? "" : (error.code ?? "");
  const message = typeof error === "string" ? error : (error.message ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}

export function isWorkflowStorageErrorIgnorable(
  error: SupabaseErrorLike | string,
  demoModeAllowed: boolean,
): boolean {
  if (!demoModeAllowed) return false;
  const code = typeof error === "string" ? "" : (error.code ?? "");
  const message = typeof error === "string" ? error : (error.message ?? "");
  return (
    isMissingSupabaseRelation(error) ||
    code === "42501" ||
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("row-level security")
  );
}
