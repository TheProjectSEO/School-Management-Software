import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * Needed for privileged operations and long-lived realtime subscriptions.
 *
 * IMPORTANT: Never expose this client to the browser.
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
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

/**
 * Creates a service client specifically configured for Realtime subscriptions.
 * Use this for SSE endpoints that need long-lived realtime connections.
 */
export function createRealtimeServiceClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE service role configuration");
  }

  return createClient(url, serviceKey, {
    db: {
      schema: "public",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
