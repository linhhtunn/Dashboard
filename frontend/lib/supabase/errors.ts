import { isDemoModeAllowed } from "@/lib/runtime-config";
import {
  isWorkflowStorageErrorIgnorable,
  type SupabaseErrorLike,
} from "@/lib/supabase/workflow-storage-error";

export function canIgnoreWorkflowStorageError(
  error: SupabaseErrorLike | string,
): boolean {
  return isWorkflowStorageErrorIgnorable(error, isDemoModeAllowed());
}
