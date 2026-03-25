import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/dal/admin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/admin/grading-periods
 * Returns grading periods for the admin's school.
 */
export async function GET() {
  const auth = await requireAdminAPI()
  if (!auth.success) return auth.response

  const supabase = createServiceClient()

  const { data: periods, error } = await supabase
    .from('grading_periods')
    .select('id, name, start_date, end_date, is_active, academic_year_id, is_current')
    .eq('school_id', auth.admin.schoolId)
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Error fetching grading periods:', error)
    return NextResponse.json({ error: 'Failed to fetch grading periods' }, { status: 500 })
  }

  return NextResponse.json({ periods: periods || [] })
}

/**
 * POST /api/admin/grading-periods
 * Create a new grading period.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAPI('settings:update')
  if (!auth.success) return auth.response

  const body = await request.json()
  const { name, start_date, end_date, academic_year_id, period_type, period_number } = body

  if (!name || !start_date || !end_date) {
    return NextResponse.json({ error: 'name, start_date, and end_date are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up year name text from academic_year_id if provided
  let academicYearText: string | null = null
  if (academic_year_id) {
    const { data: yr } = await supabase
      .from('academic_years')
      .select('name')
      .eq('id', academic_year_id)
      .single()
    academicYearText = yr?.name ?? null
  }

  const { data, error } = await supabase
    .from('grading_periods')
    .insert({
      school_id: auth.admin.schoolId,
      academic_year_id: academic_year_id || null,
      academic_year: academicYearText,
      name,
      start_date,
      end_date,
      period_type: period_type || 'quarter',
      period_number: period_number ?? (() => { const m = name.match(/\d+/); return m ? parseInt(m[0]) : 1; })(),
      is_current: false,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name, start_date, end_date, is_active, academic_year_id, is_current')
    .single()

  if (error) {
    console.error('Error creating grading period:', error)
    return NextResponse.json({ error: 'Failed to create grading period' }, { status: 500 })
  }

  return NextResponse.json({ period: data }, { status: 201 })
}

/**
 * PATCH /api/admin/grading-periods
 * Set a grading period as current (clears is_current on all others for the school).
 * Body: { periodId: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAPI('settings:update')
  if (!auth.success) return auth.response

  const { periodId } = await request.json()
  if (!periodId) return NextResponse.json({ error: 'periodId is required' }, { status: 400 })

  const supabase = createServiceClient()

  // Clear current flag on all periods for this school
  await supabase
    .from('grading_periods')
    .update({ is_current: false })
    .eq('school_id', auth.admin.schoolId)

  // Set the selected period as current
  const { error } = await supabase
    .from('grading_periods')
    .update({ is_current: true })
    .eq('id', periodId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
