import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'
import { getQueueItem, gradeQueueItem, getQuestionDetails } from '@/lib/dal/grading-queue'

/**
 * GET /api/teacher/grading/queue/[itemId]
 * Get a single queue item with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params
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

    // Fetch the queue item
    const item = await getQueueItem(itemId)

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Queue item not found' },
        { status: 404 }
      )
    }

    // Fetch question details for answer key reference
    const questionDetails = await getQuestionDetails(item.question_id)

    return NextResponse.json({
      success: true,
      item,
      questionDetails
    })

  } catch (error) {
    console.error('Error fetching queue item:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/grading/queue/[itemId]
 * Grade a queue item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params
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

    // Parse request body
    const body = await request.json()
    const { points, feedback } = body

    if (typeof points !== 'number' || points < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid points value' },
        { status: 400 }
      )
    }

    // Grade the item
    const result = await gradeQueueItem(itemId, teacherProfile.id, {
      points,
      feedback: feedback || undefined
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Item graded successfully'
    })

  } catch (error) {
    console.error('Error grading queue item:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
