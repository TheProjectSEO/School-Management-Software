import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for browser-side operations.
 * Uses the public schema where all school data now resides.
 */
export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\n\r]/g, '').trim()

  return createBrowserClient(url, key)
}

export function createPublicSchemaClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\n\r]/g, '').trim()

  return createBrowserClient(url, key, {
    db: {
      schema: "public",
    },
  })
}
