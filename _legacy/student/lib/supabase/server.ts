import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for server-side operations.
 * Uses the public schema where all school data now resides.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\n\r]/g, '').trim();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - can ignore
          }
        },
      },
    }
  );
}

export async function createPublicSchemaClient() {
  const cookieStore = await cookies();

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\n\r]/g, '').trim();

  return createServerClient(
    url,
    key,
    {
      db: {
        schema: "public",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
