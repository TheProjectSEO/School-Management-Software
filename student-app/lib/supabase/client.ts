import { createBrowserClient } from '@supabase/ssr'

/**
 * ⚠️ SCHEMA: "school software" - DO NOT CHANGE ⚠️
 *
 * Shared across student-app, teacher-app, admin-app.
 * All school tables are in "school software" schema.
 *
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school software", // ⚠️ NEVER CHANGE
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
