/**
 * POST /api/admin/grades/deped
 *   Compute General Averages for all students in a school for an academic year.
 *   Body: { academicYear, action: 'final_grades' | 'general_average' | 'honors' }
 *
 * GET  /api/admin/grades/deped?academicYear=&action=honors
 *   Get honors list for a school.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/dal/admin'
import {
  computeSchoolGeneralAverages,
  getHonorsList,
} from '@/lib/dal/deped-grades'

export async function GET(req: NextRequest) {
  const auth = await requireAdminAPI('reports:read')
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const academicYear = searchParams.get('academicYear')
  const action = searchParams.get('action')

  if (!academicYear) {
    return NextResponse.json({ error: 'academicYear is required' }, { status: 400 })
  }

  if (action === 'honors') {
    const list = await getHonorsList(auth.admin.schoolId, academicYear)
    return NextResponse.json({ success: true, honors: list })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAPI('reports:read')
  if (!auth.success) return auth.response

  const body = await req.json()
  const { academicYear, action } = body

  if (!academicYear) {
    return NextResponse.json({ error: 'academicYear is required' }, { status: 400 })
  }

  if (action === 'general_average') {
    const result = await computeSchoolGeneralAverages(
      auth.admin.schoolId,
      academicYear,
      auth.admin.adminId
    )
    return NextResponse.json(
      { ...result, success: result.failed === 0 },
      { status: result.failed === 0 ? 200 : 207 }
    )
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
