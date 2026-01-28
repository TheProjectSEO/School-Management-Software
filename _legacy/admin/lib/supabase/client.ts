import { createBrowserClient } from '@supabase/ssr'

/**
 * ✅ SCHEMA: "public" - Tables are in public schema
 *
 * All school tables are in "public" schema.
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
