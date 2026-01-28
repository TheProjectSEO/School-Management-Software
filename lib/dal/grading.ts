/**
 * Grading Data Access Layer
 * Handles individual grading item operations
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types - Matching GradingItemClient expectations
// ============================================

export interface GradingItem {
  id: string
  submission: {
    id: string
    submitted_at: string
    attempt_number: number
    status: string
    score: number | null
    feedback: string | null
  }
  student: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  }
  assessment: {
    id: string
    title: string
    type: string
    total_points: number
    course: {
      id: string
      name: string
    }
  }
  answers: {
    id: string
    question_id: string
    question_text: string
    question_type: string
    points: number
    selected_option_id: string | null
    text_answer: string | null
    is_correct: boolean | null
    points_earned: number | null
    correct_answer?: string
    options?: {
      id: string
      option_text: string
      is_correct: boolean
    }[]
  }[]
  rubric?: {
    id: string
    title: string
    criteria: {
      id: string
      name: string
      description: string
      max_points: number
    }[]
  }
}

// ============================================
// Functions
// ============================================

/**
 * Get a specific grading item (submission) for review
 */
export async function getGradingItem(
  itemId: string,
  teacherProfileId: string
): Promise<GradingItem | null> {
  const supabase = await createClient()

  // Get the submission with all related data
  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      id,
      score,
      status,
      feedback,
      submitted_at,
      graded_at,
      attempt_number,
      student:student_id (
        id,
        profile_id,
        lrn,
        profiles:profile_id (
          full_name,
          avatar_url,
          auth_user_id
        )
      ),
      assessment:assessment_id (
        id,
        title,
        type,
        total_points,
        instructions,
        course_id,
        courses:course_id (
          id,
          name
        )
      )
    `)
    .eq('id', itemId)
    .single()

  if (error || !submission) {
    console.error('Error fetching submission:', error)
    return null
  }

  // Verify teacher has access to this course
  const assessment = submission.assessment as any
  const courseId = assessment?.course_id

  if (courseId) {
    // Check teacher assignment
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', teacherProfileId)
      .single()

    if (teacherProfile) {
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('course_id', courseId)
        .eq('teacher_profile_id', teacherProfile.id)
        .single()

      if (!assignment) {
        // Also check if teacher is the course teacher
        const { data: course } = await supabase
          .from('courses')
          .select('teacher_id')
          .eq('id', courseId)
          .single()

        if (course?.teacher_id !== teacherProfile.id && course?.teacher_id !== teacherProfileId) {
          // Teacher doesn't have access
          return null
        }
      }
    }
  }

  // Get student answers with question details and answer options
  const { data: answers } = await supabase
    .from('student_answers')
    .select(`
      id,
      question_id,
      text_answer,
      selected_option_id,
      is_correct,
      points_earned,
      questions:question_id (
        id,
        question_text,
        question_type,
        points,
        correct_answer,
        answer_options (
          id,
          option_text,
          is_correct
        )
      )
    `)
    .eq('submission_id', submission.id)
    .order('created_at', { ascending: true })

  const student = submission.student as any
  const studentProfile = student?.profiles as any
  const course = assessment?.courses as any

  // Get student email from auth user
  let studentEmail = ''
  if (studentProfile?.auth_user_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(studentProfile.auth_user_id)
    studentEmail = authUser?.user?.email || ''
  }

  return {
    id: itemId,
    submission: {
      id: submission.id,
      submitted_at: submission.submitted_at,
      attempt_number: submission.attempt_number || 1,
      status: submission.status || 'pending',
      score: submission.score,
      feedback: submission.feedback
    },
    student: {
      id: student?.id || '',
      full_name: studentProfile?.full_name || 'Unknown Student',
      email: studentEmail,
      avatar_url: studentProfile?.avatar_url || null
    },
    assessment: {
      id: assessment?.id || '',
      title: assessment?.title || '',
      type: assessment?.type || 'assignment',
      total_points: assessment?.total_points || 100,
      course: {
        id: course?.id || '',
        name: course?.name || ''
      }
    },
    answers: (answers || []).map(a => {
      const question = a.questions as any
      const options = question?.answer_options || []
      return {
        id: a.id,
        question_id: a.question_id,
        question_text: question?.question_text || '',
        question_type: question?.question_type || 'essay',
        points: question?.points || 0,
        selected_option_id: a.selected_option_id,
        text_answer: a.text_answer,
        is_correct: a.is_correct,
        points_earned: a.points_earned,
        correct_answer: question?.correct_answer || undefined,
        options: options.map((opt: any) => ({
          id: opt.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct
        }))
      }
    })
  }
}

/**
 * Grade a submission
 */
export async function gradeSubmission(
  submissionId: string,
  input: {
    score: number
    feedback?: string
    answerScores?: { answerId: string; points: number }[]
  },
  teacherProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Update the submission
  const { error: submissionError } = await supabase
    .from('submissions')
    .update({
      score: input.score,
      feedback: input.feedback || null,
      status: 'graded',
      graded_at: new Date().toISOString(),
      graded_by: teacherProfileId
    })
    .eq('id', submissionId)

  if (submissionError) {
    return { success: false, error: submissionError.message }
  }

  // Update individual answer scores if provided
  if (input.answerScores && input.answerScores.length > 0) {
    for (const answerScore of input.answerScores) {
      await supabase
        .from('student_answers')
        .update({
          points_earned: answerScore.points
        })
        .eq('id', answerScore.answerId)
    }
  }

  return { success: true }
}

/**
 * Release a graded submission to the student
 */
export async function releaseSubmission(
  submissionId: string,
  teacherProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: teacherProfileId
    })
    .eq('id', submissionId)
    .eq('status', 'graded')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
