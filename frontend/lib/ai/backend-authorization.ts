import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function resolveBackendAuthorization(request: Request): Promise<string | null> {
  const provided = request.headers.get("authorization");
  if (provided) return provided;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? `Bearer ${data.session.access_token}` : null;
}
