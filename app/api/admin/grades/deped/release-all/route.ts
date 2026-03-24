/**
 * POST /api/admin/grades/deped/release-all
 * Release ALL final grades + general averages for a school and academic year.
 * Body: { academicYear }
 *
 * Steps:
 *   1. Release all deped_final_grades for this school/year
 *   2. Compute general averages for all students
 *   3. Release all general averages
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/dal/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { computeSchoolGeneralAverages, releaseGeneralAverages } from '@/lib/dal/deped-grades'

export async function POST(req: NextRequest) {
  const auth = await requireAdminAPI('reports:read')
  if (!auth.success) return auth.response

  const body = await req.json()
  const { academicYear } = body

  if (!academicYear) {
    return NextResponse.json({ error: 'academicYear is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Step 1: Release all final grades for this school + year
  const { error: releaseError } = await supabase
    .from('deped_final_grades')
    .update({
      is_released: true,
      released_at: new Date().toISOString(),
      released_by: auth.admin.adminId,
      updated_at:  new Date().toISOString(),
    })
    .eq('school_id', auth.admin.schoolId)
    .eq('academic_year', academicYear)

  if (releaseError) {
    return NextResponse.json({ success: false, error: releaseError.message }, { status: 500 })
  }

  // Step 2: Compute general averages for all students in the school this year
  const gaResult = await computeSchoolGeneralAverages(
    auth.admin.schoolId,
    academicYear,
    auth.admin.adminId
  )

  // Step 3: Release all computed general averages
  const gaRelease = await releaseGeneralAverages(auth.admin.schoolId, academicYear)

  if (!gaRelease.success) {
    return NextResponse.json(
      { success: false, error: `Final grades released but GA release failed: ${gaRelease.error}` },
      { status: 207 }
    )
  }

  return NextResponse.json({
    success: true,
    generalAveragesComputed: gaResult.success,
    generalAveragesFailed:   gaResult.failed,
  })
}
