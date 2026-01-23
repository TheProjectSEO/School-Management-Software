import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using service role.
 * Required for admissions/admin privileged actions.
 */
export function createServiceClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE service role configuration");
  }

  return createClient(url, serviceKey, {
    db: { schema: "public" },
  });
}
