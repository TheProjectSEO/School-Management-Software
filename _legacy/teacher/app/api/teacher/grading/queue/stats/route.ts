import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQueueStats } from '@/lib/dal/grading-queue'

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/grading/queue/stats
 * Get grading queue statistics for the authenticated teacher
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teacher profile
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('user_id', user.id)
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
