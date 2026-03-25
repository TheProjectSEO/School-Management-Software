import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'
import { batchGenerateReportCards } from '@/lib/report-cards/generator'

/**
 * POST /api/teacher/report-cards/generate
 * Batch-generate draft report cards for all students in a section/period.
 * Body: { section_id, grading_period_id }
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { section_id, grading_period_id } = body

  if (!section_id || !grading_period_id) {
    return NextResponse.json(
      { error: 'section_id and grading_period_id are required' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Get school_id from teacher profile
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('school_id')
    .eq('profile_id', auth.teacher.userId)
    .single()

  const schoolId = teacherProfile?.school_id
  if (!schoolId) {
    return NextResponse.json({ error: 'Teacher school not found' }, { status: 400 })
  }

  const results = await batchGenerateReportCards(
    section_id,
    grading_period_id,
    schoolId,
    auth.teacher.teacherId
  )

  return NextResponse.json({
    success: true,
    generated: results.generated,
    failed: results.failed,
    errors: results.errors,
  })
}
