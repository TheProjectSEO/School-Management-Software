import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/dal/admin'
import { batchGenerateReportCards } from '@/lib/report-cards/generator'

/**
 * POST /api/admin/report-cards/generate
 * Generate report cards for all students in a section for a grading period.
 * Body: { sectionId, gradingPeriodId }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('reports:read')
    if (!auth.success) return auth.response

    const body = await request.json()
    const { sectionId, gradingPeriodId } = body

    if (!sectionId || !gradingPeriodId) {
      return NextResponse.json(
        { error: 'sectionId and gradingPeriodId are required' },
        { status: 400 }
      )
    }

    const results = await batchGenerateReportCards(
      sectionId,
      gradingPeriodId,
      auth.admin.schoolId,
      auth.admin.adminId
    )

    return NextResponse.json({
      success: results.failed === 0,
      generated: results.generated,
      failed: results.failed,
      errors: results.errors,
      report_card_ids: results.report_card_ids,
    })
  } catch (error) {
    console.error('Error generating report cards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
