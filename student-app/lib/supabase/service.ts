import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * Needed for privileged operations (e.g., admissions workflow inserts/updates).
 */
export function createServiceClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE service role configuration");
  }

  return createClient(url, serviceKey, {
    db: {
      schema: "public",
    },
  });
}
