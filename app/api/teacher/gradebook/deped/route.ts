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
  const { courseId, periodId, schoolId, action } = body

  if (!courseId || !periodId || !schoolId) {
    return NextResponse.json(
      { error: 'courseId, periodId, and schoolId are required' },
      { status: 400 }
    )
  }

  if (action === 'release') {
    const result = await releaseQuarterlyGrades(
      courseId,
      periodId,
      auth.teacher.teacherId
    )
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  }

  // Default: compute
  const result = await computeClassQuarterlyGrades(
    courseId,
    periodId,
    auth.teacher.teacherId,
    schoolId
  )

  return NextResponse.json(
    { ...result, success: result.failed === 0 },
    { status: result.failed === 0 ? 200 : 207 }
  )
}
