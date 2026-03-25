import { NextResponse } from 'next/server'
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
