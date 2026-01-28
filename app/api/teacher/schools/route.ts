import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

/**
 * GET /api/schools
 *
 * Returns list of all schools for registration dropdown
 * This endpoint uses server-side Supabase client to bypass RLS
 * (or relies on public SELECT policy on schools table)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, slug')
      .order('name')

    if (error) {
      console.error('Error fetching schools:', error)
      return NextResponse.json(
        { error: 'Failed to fetch schools', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ schools })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
