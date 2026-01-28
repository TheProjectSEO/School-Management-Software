import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoGradeSubmission, processSubmission, regradeSubmission } from '@/lib/grading/auto-grader'

/**
 * POST /api/teacher/grading/auto-grade
 * Trigger auto-grading for a submission
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { submissionId, action = 'grade' } = body

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Verify teacher has access to this submission
    const { data: submission } = await supabase
      .from('submissions')
      .select(`
        id,
        assessment_id,
        assessments!inner(
          course_id
        )
      `)
      .eq('id', submissionId)
      .single()

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Extract course_id from the nested assessment relation
    const assessment = submission.assessments as unknown as { course_id: string }
    const courseId = assessment.course_id

    // Verify teacher assignment
    const { count } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', courseId)

    if ((count || 0) === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Perform the requested action
    let result

    if (action === 'regrade') {
      result = await regradeSubmission(submissionId)
    } else if (action === 'process') {
      const processResult = await processSubmission(submissionId)
      result = {
        submissionId,
        totalPoints: processResult.autoGradedPoints,
        maxPoints: processResult.totalPossible,
        autoGradedCount: processResult.totalPossible - processResult.pendingManual,
        pendingManualCount: processResult.pendingManual,
        results: []
      }
    } else {
      result = await autoGradeSubmission(submissionId)
    }

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('Error auto-grading submission:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
