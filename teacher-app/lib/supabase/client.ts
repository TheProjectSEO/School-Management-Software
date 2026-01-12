import { createBrowserClient } from '@supabase/ssr'

/**
 * ⚠️ CRITICAL: CORRECT SCHEMA IS "school software" ⚠️
 *
 * Schema: "school software" (with space)
 *
 * ALL school management tables are in "school software" schema:
 * - schools, sections, students, courses
 * - teacher_profiles, profiles, modules, lessons
 * - assessments, submissions, enrollments, etc.
 *
 * IMPORTANT:
 * - Duplicate tables in public and n8n_content_creation have been DELETED
 * - "school software" schema must be exposed to PostgREST API in Supabase Dashboard
 * - See EXPOSE_SCHEMA_INSTRUCTIONS.md if you get PGRST106 error
 *
 * DO NOT change this to "public" or "n8n_content_creation"!
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school software", // ⚠️ CORRECT SCHEMA - Source of truth
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
