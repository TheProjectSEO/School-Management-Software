import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'
import { gradeSubmission, releaseSubmission } from '@/lib/dal/grading'

/**
 * POST /api/teacher/grading/[itemId]
 * Grade a full submission with per-question scores
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
    const { scores, feedback, totalScore, release } = body

    // Validate input
    if (!scores || typeof scores !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid scores object' },
        { status: 400 }
      )
    }

    if (typeof totalScore !== 'number' || totalScore < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid total score' },
        { status: 400 }
      )
    }

    // The itemId in the grading page is the submission ID
    const submissionId = itemId

    // Verify the submission exists and belongs to a course this teacher teaches
    // Step 1: Fetch the submission to get assessment_id
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, assessment_id')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Step 2: Fetch the assessment to get course_id
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, course_id')
      .eq('id', submission.assessment_id)
      .single()

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Step 3: Verify teacher is assigned to this course
    const { data: teacherAssignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', assessment.course_id)
      .limit(1)
      .single()

    if (!teacherAssignment) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to grade this submission' },
        { status: 403 }
      )
    }

    // Get student answers to map question_id to answer_id
    const { data: answers } = await supabase
      .from('student_answers')
      .select('id, question_id')
      .eq('submission_id', submissionId)

    // Transform scores from {question_id: points} to {answerId: points}
    const answerScores: { answerId: string; points: number }[] = []
    if (answers) {
      for (const answer of answers) {
        if (answer.question_id in scores) {
          answerScores.push({
            answerId: answer.id,
            points: scores[answer.question_id]
          })
        }
      }
    }

    // Grade the submission
    const gradeResult = await gradeSubmission(
      submissionId,
      {
        score: totalScore,
        feedback: feedback || undefined,
        answerScores
      },
      teacherProfile.id
    )

    if (!gradeResult.success) {
      return NextResponse.json(
        { success: false, error: gradeResult.error },
        { status: 400 }
      )
    }

    // Release if requested
    if (release) {
      const releaseResult = await releaseSubmission(submissionId, teacherProfile.id)
      if (!releaseResult.success) {
        // Grade was saved but release failed - still report success but warn
        return NextResponse.json({
          success: true,
          message: 'Grades saved but failed to release: ' + releaseResult.error,
          released: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: release ? 'Grades released successfully' : 'Grades saved as draft',
      released: release
    })

  } catch (error) {
    console.error('Error grading submission:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
