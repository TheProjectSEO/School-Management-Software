import { type NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyTeacherCourseAccess } from '@/lib/dal/teacher/gradebook'

export async function POST(req: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const body = await req.json()
  const { studentId, courseId, gradingPeriodId, attendanceCount, totalClassDays, behaviorScore } = body

  if (!studentId || !courseId || !gradingPeriodId) {
    return NextResponse.json({ error: 'studentId, courseId, and gradingPeriodId are required' }, { status: 400 })
  }

  const hasAccess = await verifyTeacherCourseAccess(auth.teacher.teacherId, courseId)
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('course_grades')
    .upsert(
      {
        student_id:       studentId,
        course_id:        courseId,
        grading_period_id: gradingPeriodId,
        school_id:        auth.teacher.schoolId,
        attendance_count: Math.max(0, Number(attendanceCount) || 0),
        total_class_days: Math.max(0, Number(totalClassDays) || 0),
        behavior_score:   Math.min(100, Math.max(0, Number(behaviorScore) || 0)),
      },
      { onConflict: 'student_id,course_id,grading_period_id' }
    )

  if (error) {
    console.error('[save-attendance-behavior] upsert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
