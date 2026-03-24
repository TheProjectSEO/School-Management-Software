/**
 * POST /api/admin/grades/deped/final
 *   Compute Final Grades for all students in a course for an academic year.
 *   Body: { courseId, academicYear }
 *
 * GET  /api/admin/grades/deped/final?courseId=&academicYear=
 *   Get final grades for a course.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/dal/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { computeClassFinalGrades, computeSchoolGeneralAverages, releaseGeneralAverages } from '@/lib/dal/deped-grades'

export async function GET(req: NextRequest) {
  const auth = await requireAdminAPI('reports:read')
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const academicYear = searchParams.get('academicYear')

  if (!courseId || !academicYear) {
    return NextResponse.json({ error: 'courseId and academicYear are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('deped_final_grades')
    .select('id, student_id, course_id, academic_year, q1_grade, q2_grade, q3_grade, q4_grade, final_grade, is_released')
    .eq('course_id', courseId)
    .eq('academic_year', academicYear)
    .eq('school_id', auth.admin.schoolId)
    .order('final_grade', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, finalGrades: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAPI('reports:read')
  if (!auth.success) return auth.response

  const body = await req.json()
  const { courseId, academicYear, action } = body

  if (!courseId || !academicYear) {
    return NextResponse.json({ error: 'courseId and academicYear are required' }, { status: 400 })
  }

  // Release final grades
  if (action === 'release') {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('deped_final_grades')
      .update({
        is_released:  true,
        released_at:  new Date().toISOString(),
        released_by:  auth.admin.adminId,
        updated_at:   new Date().toISOString(),
      })
      .eq('course_id', courseId)
      .eq('academic_year', academicYear)
      .eq('school_id', auth.admin.schoolId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    // Auto-compute + release general averages for all students in school/year
    await computeSchoolGeneralAverages(auth.admin.schoolId, academicYear, auth.admin.adminId)
    await releaseGeneralAverages(auth.admin.schoolId, academicYear)

    return NextResponse.json({ success: true })
  }

  // Default: compute final grades
  const result = await computeClassFinalGrades(
    courseId,
    academicYear,
    auth.admin.schoolId,
    auth.admin.adminId
  )

  return NextResponse.json(
    { ...result, success: result.failed === 0 },
    { status: result.failed === 0 ? 200 : 207 }
  )
}
