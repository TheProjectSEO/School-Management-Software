import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { createServiceClient } from '@/lib/supabase/service'
import { autoGradeSubmission, processSubmission, regradeSubmission } from '@/lib/grading/auto-grader'

/**
 * POST /api/teacher/grading/auto-grade
 * Trigger auto-grading for a submission
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI()
  if (!authResult.success) return authResult.response

  try {
    const supabase = createServiceClient()

    // Parse request body
    const body = await request.json()
    const { submissionId, action = 'grade' } = body

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Verify teacher has access to this submission — flat select (no FK joins per BUG-001)
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, assessment_id')
      .eq('id', submissionId)
      .single()

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Fetch assessment separately to get course_id
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('course_id')
      .eq('id', submission.assessment_id)
      .single()

    if (!assessmentData) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const courseId = assessmentData.course_id

    // Verify teacher assignment
    const { count } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', authResult.teacher.teacherId)
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
