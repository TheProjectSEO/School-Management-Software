import { type NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyTeacherCourseAccess } from '@/lib/dal/teacher/gradebook'

/**
 * POST /api/teacher/gradebook/sync-attendance
 *
 * Reads teacher_daily_attendance records for the section linked to the course
 * within the grading period's date range, then upserts attendance_count and
 * total_class_days into course_grades for each student.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const body = await req.json()
  const { courseId, gradingPeriodId } = body

  if (!courseId || !gradingPeriodId) {
    return NextResponse.json(
      { error: 'courseId and gradingPeriodId are required' },
      { status: 400 }
    )
  }

  const hasAccess = await verifyTeacherCourseAccess(auth.teacher.teacherId, courseId)
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServiceClient()

  // 1. Get grading period date range
  const { data: period, error: periodError } = await supabase
    .from('grading_periods')
    .select('start_date, end_date')
    .eq('id', gradingPeriodId)
    .single()

  if (periodError || !period) {
    return NextResponse.json({ error: 'Grading period not found' }, { status: 404 })
  }

  // 2. Get section_id linked to this course
  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('section_id')
    .eq('course_id', courseId)
    .eq('teacher_profile_id', auth.teacher.teacherId)
    .limit(1)
    .single()

  if (!assignment?.section_id) {
    return NextResponse.json({ error: 'No section linked to this course' }, { status: 404 })
  }

  const sectionId = assignment.section_id

  // 3. Get all students in this section
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('section_id', sectionId)
    .eq('status', 'active')

  if (!students || students.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No students found in section' })
  }

  const studentIds = students.map((s) => s.id)

  // 4. Query attendance records within the grading period date range
  const { data: records, error: attError } = await supabase
    .from('teacher_daily_attendance')
    .select('student_id, date, status')
    .in('student_id', studentIds)
    .gte('date', period.start_date)
    .lte('date', period.end_date)

  if (attError) {
    console.error('[sync-attendance] query error:', attError.message)
    return NextResponse.json({ error: attError.message }, { status: 500 })
  }

  // 5. Calculate total_class_days = distinct dates where ANY record exists
  const allDates = new Set((records ?? []).map((r) => r.date))
  const totalClassDays = allDates.size

  // 6. Per-student: count days present (present or late counts as attended)
  const attendanceByStudent: Record<string, number> = {}
  for (const studentId of studentIds) {
    attendanceByStudent[studentId] = 0
  }
  for (const record of records ?? []) {
    if (record.status === 'present' || record.status === 'late') {
      attendanceByStudent[record.student_id] = (attendanceByStudent[record.student_id] ?? 0) + 1
    }
  }

  // 7. Upsert into course_grades
  const upsertRows = studentIds.map((studentId) => ({
    student_id: studentId,
    course_id: courseId,
    grading_period_id: gradingPeriodId,
    school_id: auth.teacher.schoolId,
    attendance_count: attendanceByStudent[studentId] ?? 0,
    total_class_days: totalClassDays,
  }))

  const { error: upsertError } = await supabase
    .from('course_grades')
    .upsert(upsertRows, { onConflict: 'student_id,course_id,grading_period_id' })

  if (upsertError) {
    console.error('[sync-attendance] upsert error:', upsertError.message)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    synced: studentIds.length,
    totalClassDays,
    message: `Synced attendance for ${studentIds.length} students (${totalClassDays} class days in period)`,
  })
}
