import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI'
import { gradeSubmission, releaseSubmission } from '@/lib/dal/grading'
import { calculateCourseGrade } from '@/lib/dal/teacher/gradebook'
import { compileReportCardData, createReportCardSnapshot } from '@/lib/report-cards/generator'

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
      // Non-fatal: log but continue so grade calc + report card still happen
      console.warn('releaseSubmission warning:', releaseResult.error)
    }
  }

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
      // Recalculate and save course grade
      const courseGrade = await calculateCourseGrade(
        submissionMeta.student_id,
        assessment.course_id,
        assessment.grading_period_id
      )

      if (release && courseGrade) {
        // Mark the course grade as released so it shows in the report card
        await supabase
          .from('course_grades')
          .update({
            is_released: true,
            status: 'released',
            released_at: new Date().toISOString(),
            released_by: auth.teacher.teacherId,
          })
          .eq('id', courseGrade.id)

        // Mark all grading queue items for this submission as completed (released)
        // No status filter — update all rows for this submission
        const { error: queueReleaseError } = await supabase
          .from('teacher_grading_queue')
          .update({ status: 'completed', graded_at: new Date().toISOString() })
          .eq('submission_id', submissionId)
        if (queueReleaseError) {
          console.error('[release] queue update error:', queueReleaseError.message)
        }

        // Regenerate report card snapshot so it reflects the released grade
        try {
          const reportData = await compileReportCardData(
            submissionMeta.student_id,
            assessment.grading_period_id
          )
          if (reportData) {
            await createReportCardSnapshot(
              submissionMeta.student_id,
              assessment.grading_period_id,
              auth.teacher.schoolId,
              reportData,
              auth.teacher.teacherId
            )
          }
        } catch (rcErr) {
          console.warn('Could not regenerate report card snapshot:', rcErr)
        }

        // Notify the student
        try {
          await supabase.from('notifications').insert({
            student_id: submissionMeta.student_id,
            type: 'grade_released',
            title: 'Grade Released',
            message: 'Your grade for an assessment has been released. Check your gradebook.',
            is_read: false,
            created_at: new Date().toISOString(),
          })
        } catch {
          // Non-critical
        }
      }
    }
  }

  return NextResponse.json({ success: true, released: !!release })
}
