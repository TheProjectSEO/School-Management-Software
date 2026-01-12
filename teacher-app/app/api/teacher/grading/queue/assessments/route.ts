import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssessmentsWithPendingGrading } from '@/lib/dal/grading-queue'

/**
 * GET /api/teacher/grading/queue/assessments
 * Get assessments that have pending grading items for the authenticated teacher
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

    // Fetch assessments with pending grading
    const assessments = await getAssessmentsWithPendingGrading(teacherProfile.id)

    return NextResponse.json({
      success: true,
      assessments
    })

  } catch (error) {
    console.error('Error fetching assessments with pending grading:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
