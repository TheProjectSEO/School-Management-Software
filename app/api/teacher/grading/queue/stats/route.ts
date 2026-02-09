import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'
import { getQueueStats } from '@/lib/dal/grading-queue'

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/grading/queue/stats
 * Get grading queue statistics for the authenticated teacher
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

    // Fetch stats
    const stats = await getQueueStats(teacherProfile.id)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error fetching queue stats:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
