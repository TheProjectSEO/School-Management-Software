/**
 * GET  /api/teacher/gradebook/deped?courseId=&periodId=
 *   Returns the DepEd quarterly grade breakdown for all students in a class.
 *
 * POST /api/teacher/gradebook/deped
 *   Computes and saves quarterly grades for all students in a class.
 *   Body: { courseId, periodId, schoolId }
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import {
  getClassQuarterlyGrades,
  computeClassQuarterlyGrades,
  releaseQuarterlyGrades,
} from '@/lib/dal/deped-grades'
import { verifyTeacherCourseAccess } from '@/lib/dal/teacher/gradebook'

// GET — fetch quarterly grades for display
export async function GET(req: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const periodId = searchParams.get('periodId')

  if (!courseId || !periodId) {
    return NextResponse.json({ error: 'courseId and periodId are required' }, { status: 400 })
  }

  const hasAccess = await verifyTeacherCourseAccess(auth.teacher.teacherId, courseId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const report = await getClassQuarterlyGrades(courseId, periodId)
  if (!report) {
    return NextResponse.json({ error: 'Course or period not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, report })
}

// POST — compute quarterly grades
export async function POST(req: NextRequest) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const body = await req.json()
  const { courseId, periodId, action } = body

  if (!courseId || !periodId) {
    return NextResponse.json(
      { error: 'courseId and periodId are required' },
      { status: 400 }
    )
  }

  const hasAccess = await verifyTeacherCourseAccess(auth.teacher.teacherId, courseId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'release') {
    const result = await releaseQuarterlyGrades(
      courseId,
      periodId,
      auth.teacher.teacherId
    )
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  }

  // Default: compute — use auth schoolId, not client-supplied value
  const result = await computeClassQuarterlyGrades(
    courseId,
    periodId,
    auth.teacher.teacherId,
    auth.teacher.schoolId
  )

  return NextResponse.json(
    { ...result, success: result.failed === 0 },
    { status: result.failed === 0 ? 200 : 207 }
  )
}
