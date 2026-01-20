import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client for teacher-app.
 * Uses the public schema where all core data resides.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
    }
  )
}

/**
 * Creates a Supabase browser client for the public schema.
 * Use this only when you specifically need to query public schema tables.
 */
export function createPublicSchemaClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
    }
  )
}
