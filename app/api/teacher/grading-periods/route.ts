import { NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/teacher/grading-periods
 * Returns grading periods for the teacher's school.
 */
export async function GET() {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const supabase = createServiceClient()

  // Get teacher's school_id
  const { data: tp } = await supabase
    .from('teacher_profiles')
    .select('school_id')
    .eq('id', auth.teacher.teacherId)
    .single()

  const schoolId = tp?.school_id || auth.teacher.schoolId

  const { data: periods, error } = await supabase
    .from('grading_periods')
    .select('id, name, start_date, end_date, order, is_active')
    .eq('school_id', schoolId)
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching grading periods:', error)
    return NextResponse.json({ error: 'Failed to fetch grading periods' }, { status: 500 })
  }

  return NextResponse.json({ periods: periods || [] })
}
