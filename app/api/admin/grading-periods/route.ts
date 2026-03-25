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
    .select('id, name, start_date, end_date, is_active, academic_year_id')
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
  const { name, start_date, end_date, academic_year_id, period_type } = body

  if (!name || !start_date || !end_date) {
    return NextResponse.json({ error: 'name, start_date, and end_date are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('grading_periods')
    .insert({
      school_id: auth.admin.schoolId,
      academic_year_id: academic_year_id || null,
      name,
      start_date,
      end_date,
      period_type: period_type || 'quarter',
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name, start_date, end_date, is_active, academic_year_id')
    .single()

  if (error) {
    console.error('Error creating grading period:', error)
    return NextResponse.json({ error: 'Failed to create grading period' }, { status: 500 })
  }

  return NextResponse.json({ period: data }, { status: 201 })
}
