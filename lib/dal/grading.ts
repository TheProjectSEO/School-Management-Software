/**
 * Grading Data Access Layer
 * Handles individual grading item operations
 */

import { createServiceClient } from '@/lib/supabase/service'

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
  const supabase = createServiceClient()

  // 1. Fetch submission (flat)
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, assessment_id, student_id, score, status, feedback, submitted_at, graded_at, attempt_number')
    .eq('id', itemId)
    .single()

  if (error || !submission) {
    console.error('Error fetching submission:', error)
    return null
  }

  // 2. Fetch assessment (flat)
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, type, total_points, course_id')
    .eq('id', submission.assessment_id)
    .single()

  if (!assessment) return null

  // 3. Verify teacher has access to this course
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('profile_id', teacherProfileId)
    .single()

  if (teacherProfile) {
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('course_id', assessment.course_id)
      .eq('teacher_profile_id', teacherProfile.id)
      .single()

    if (!assignment) return null
  }

  // 4. Fetch course (flat)
  const { data: course } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', assessment.course_id)
    .single()

  // 5. Fetch student (flat)
  const { data: student } = await supabase
    .from('students')
    .select('id, profile_id, lrn')
    .eq('id', submission.student_id)
    .single()

  // 6. Fetch student display name + avatar (flat)
  let full_name = 'Unknown Student'
  let avatar_url: string | null = null
  if (student?.profile_id) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, avatar_url')
      .eq('id', student.profile_id)
      .single()
    if (profile) {
      full_name = profile.full_name || 'Unknown Student'
      avatar_url = profile.avatar_url || null
    }
  }

  // 7. Fetch student answers (flat)
  const { data: answerRows } = await supabase
    .from('student_answers')
    .select('id, question_id, text_answer, selected_option_id, is_correct, points_earned')
    .eq('submission_id', submission.id)
    .order('created_at', { ascending: true })

  const answers = answerRows || []

  // 8. Fetch questions for those answers (flat, batch)
  const questionIds = [...new Set(answers.map(a => a.question_id).filter(Boolean))]
  let questionMap = new Map<string, any>()
  if (questionIds.length > 0) {
    const { data: questions } = await supabase
      .from('teacher_assessment_questions')
      .select('id, question_text, question_type, points, choices_json, answer_key_json')
      .in('id', questionIds)
    if (questions) {
      questions.forEach(q => questionMap.set(q.id, q))
    }
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
      full_name,
      email: '',  // email not needed for grading UI
      avatar_url
    },
    assessment: {
      id: assessment.id,
      title: assessment.title || '',
      type: assessment.type || 'assignment',
      total_points: assessment.total_points || 100,
      course: {
        id: course?.id || '',
        name: course?.name || ''
      }
    },
    answers: answers.map(a => {
      const question = questionMap.get(a.question_id)
      // Build options from choices_json (array of strings or {id, text} objects)
      const choicesJson = question?.choices_json
      const answerKeyJson = question?.answer_key_json
      const options = Array.isArray(choicesJson)
        ? choicesJson.map((choice: any, idx: number) => {
            const choiceText = typeof choice === 'string' ? choice : (choice.text || choice.option_text || String(choice))
            const choiceId = typeof choice === 'object' && choice.id ? choice.id : String(idx)
            const correctIndex = answerKeyJson?.correctIndex
            const isCorrect = correctIndex !== undefined ? correctIndex === idx : false
            return { id: choiceId, option_text: choiceText, is_correct: isCorrect }
          })
        : []
      // Extract correct answer text for display
      let correct_answer: string | undefined
      if (answerKeyJson?.correctAnswer) {
        correct_answer = String(answerKeyJson.correctAnswer)
      } else if (answerKeyJson?.correctText) {
        correct_answer = String(answerKeyJson.correctText)
      }
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
        correct_answer,
        options
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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: teacherProfileId,
    })
    .eq('id', submissionId)
    .eq('status', 'graded')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
