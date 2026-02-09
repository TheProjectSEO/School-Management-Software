import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'
import { getGradingQueue, GradingQueueFilters } from '@/lib/dal/grading-queue'

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/grading/queue
 * Get grading queue items for the authenticated teacher
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get authenticated user using JWT
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teacher profile using profile_id from JWT
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', currentUser.profile_id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json(
        { success: false, error: 'Teacher profile not found' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filters: GradingQueueFilters = {}

    const status = searchParams.get('status')
    if (status && ['pending', 'graded', 'flagged'].includes(status)) {
      filters.status = status as 'pending' | 'graded' | 'flagged'
    }

    const assessmentId = searchParams.get('assessmentId')
    if (assessmentId) {
      filters.assessmentId = assessmentId
    }

    const courseId = searchParams.get('courseId')
    if (courseId) {
      filters.courseId = courseId
    }

    const questionType = searchParams.get('questionType')
    if (questionType) {
      filters.questionType = questionType
    }

    const submissionId = searchParams.get('submission')
    if (submissionId) {
      filters.submissionId = submissionId
    }

    const priority = searchParams.get('priority')
    if (priority === 'high') {
      filters.priority = 'high'
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch queue items
    const items = await getGradingQueue(teacherProfile.id, filters, limit, offset)

    return NextResponse.json({
      success: true,
      items,
      count: items.length
    })

  } catch (error) {
    console.error('Error fetching grading queue:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
