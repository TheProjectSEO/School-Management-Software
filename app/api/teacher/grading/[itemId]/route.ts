import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { gradeSubmission, releaseSubmission } from '@/lib/dal/grading'
import { calculateCourseGrade } from '@/lib/dal/teacher/gradebook'

/**
 * POST /api/teacher/grading/[itemId]
 * Grade a full submission with per-question scores.
 * [itemId] is the submission ID.
 * Body: { scores: Record<questionId, points>, feedback?: string, totalScore: number, release?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireTeacherAPI()
  if (!auth.success) return auth.response

  const { itemId: submissionId } = await params
  const body = await request.json()
  const { scores, feedback, totalScore, release } = body as {
    scores: Record<string, number>
    feedback?: string
    totalScore: number
    release?: boolean
  }

  if (totalScore === undefined || !scores) {
    return NextResponse.json({ error: 'scores and totalScore are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Map question_id → answer row ID for this submission
  const questionIds = Object.keys(scores)
  const { data: answerRows } = await supabase
    .from('student_answers')
    .select('id, question_id')
    .eq('submission_id', submissionId)
    .in('question_id', questionIds)

  const answerScores = (answerRows || []).map(a => ({
    answerId: a.id,
    points: scores[a.question_id] ?? 0,
  }))

  // Grade the submission
  const gradeResult = await gradeSubmission(
    submissionId,
    { score: totalScore, feedback: feedback || undefined, answerScores },
    auth.teacher.teacherId
  )

  if (!gradeResult.success) {
    return NextResponse.json({ error: gradeResult.error || 'Failed to save grade' }, { status: 500 })
  }

  // Release to student if requested
  if (release) {
    const releaseResult = await releaseSubmission(submissionId, auth.teacher.teacherId)
    if (!releaseResult.success) {
      return NextResponse.json({ error: releaseResult.error || 'Failed to release' }, { status: 500 })
    }
  }

  // Update course grade so the gradebook reflects the new score
  // Look up student_id, course_id, and grading_period_id from the submission
  const { data: submissionMeta } = await supabase
    .from('submissions')
    .select('student_id, assessment_id')
    .eq('id', submissionId)
    .single()

  if (submissionMeta) {
    const { data: assessment } = await supabase
      .from('assessments')
      .select('course_id, grading_period_id')
      .eq('id', submissionMeta.assessment_id)
      .single()

    if (assessment?.course_id && assessment?.grading_period_id) {
      await calculateCourseGrade(
        submissionMeta.student_id,
        assessment.course_id,
        assessment.grading_period_id
      )
    }
  }

  return NextResponse.json({ success: true })
}
