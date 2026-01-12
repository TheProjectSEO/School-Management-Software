import { createClient } from '@/lib/supabase/server'

export type Assessment = {
  id: string
  title: string
  description: string | null
  type: 'quiz' | 'assignment' | 'project' | 'midterm' | 'final'
  due_date: string | null
  total_points: number
  time_limit_minutes: number | null
  max_attempts: number
  instructions: string | null
  course_id: string
  course_name: string
  section_name: string
  submission_count: number
  graded_count: number
  status: 'draft' | 'published' | 'closed'
  created_at: string
}

export type QuestionBank = {
  id: string
  name: string
  description: string | null
  course_id: string
  question_count: number
  created_at: string
}

export type Submission = {
  id: string
  assessment_id: string
  assessment_title: string
  student_id: string
  student_name: string
  student_lrn: string
  score: number | null
  status: 'submitted' | 'graded' | 'returned'
  submitted_at: string
  graded_at: string | null
  attempt_number: number
  has_rubric_score: boolean
  has_feedback: boolean
}

export type SubmissionDetail = {
  id: string
  assessment: {
    id: string
    title: string
    type: string
    total_points: number
    instructions: string | null
  }
  student: {
    id: string
    full_name: string
    lrn: string
    avatar_url: string | null
  }
  score: number | null
  submitted_at: string
  graded_at: string | null
  feedback: string | null
  status: string
  attempt_number: number
  answers: Array<{
    id: string
    question_id: string
    question_text: string
    question_type: string
    points: number
    selected_option_id: string | null
    text_answer: string | null
    is_correct: boolean | null
    points_earned: number | null
  }>
}

/**
 * Get all assessments for a teacher's courses
 */
export async function getTeacherAssessments(teacherId: string) {
  const supabase = await createClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      course:courses!inner(
        name,
        section:sections!inner(name)
      )
    `)
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assessments:', error)
    return []
  }

  // Enrich with submission counts
  const enriched = await Promise.all(
    data.map(async (assessment) => {
      const [submissionCount, gradedCount] = await Promise.all([
        getSubmissionCount(assessment.id),
        getGradedCount(assessment.id)
      ])

      return {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        due_date: assessment.due_date,
        total_points: assessment.total_points,
        time_limit_minutes: assessment.time_limit_minutes,
        max_attempts: assessment.max_attempts,
        instructions: assessment.instructions,
        course_id: assessment.course_id,
        course_name: assessment.course.name,
        section_name: assessment.course.section.name,
        submission_count: submissionCount,
        graded_count: gradedCount,
        status: determineAssessmentStatus(assessment),
        created_at: assessment.created_at
      } as Assessment
    })
  )

  return enriched
}

/**
 * Get pending submissions for grading
 */
export async function getPendingSubmissions(teacherId: string, filters?: {
  courseId?: string
  assessmentId?: string
  status?: string
}) {
  const supabase = await createClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  let query = supabase
    .from('submissions')
    .select(`
      *,
      assessment:assessments!inner(
        id,
        title,
        type,
        course_id
      ),
      student:students!inner(
        id,
        lrn,
        profile:profiles!inner(full_name)
      )
    `)
    .in('assessment.course_id', courseIds)
    .order('submitted_at', { ascending: true })

  if (filters?.courseId) {
    query = query.eq('assessment.course_id', filters.courseId)
  }

  if (filters?.assessmentId) {
    query = query.eq('assessment_id', filters.assessmentId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    // Default to pending only
    query = query.eq('status', 'submitted')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching submissions:', error)
    return []
  }

  // Enrich with additional data
  const enriched = await Promise.all(
    data.map(async (submission) => {
      const [hasRubricScore, hasFeedback] = await Promise.all([
        checkSubmissionHasRubricScore(submission.id),
        checkSubmissionHasFeedback(submission.id)
      ])

      return {
        id: submission.id,
        assessment_id: submission.assessment_id,
        assessment_title: submission.assessment.title,
        student_id: submission.student_id,
        student_name: submission.student.profile.full_name,
        student_lrn: submission.student.lrn,
        score: submission.score,
        status: submission.status,
        submitted_at: submission.submitted_at,
        graded_at: submission.graded_at,
        attempt_number: submission.attempt_number,
        has_rubric_score: hasRubricScore,
        has_feedback: hasFeedback
      } as Submission
    })
  )

  return enriched
}

/**
 * Get detailed submission for grading
 */
export async function getSubmissionDetail(submissionId: string, teacherId: string) {
  const supabase = await createClient()

  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select(`
      *,
      assessment:assessments!inner(
        id,
        title,
        type,
        total_points,
        instructions,
        course_id
      ),
      student:students!inner(
        id,
        lrn,
        profile:profiles!inner(
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    console.error('Error fetching submission:', submissionError)
    return null
  }

  // Verify teacher access
  const hasAccess = await verifyTeacherAssessmentAccess(teacherId, submission.assessment.course_id)
  if (!hasAccess) return null

  // Get answers
  const { data: answers } = await supabase
    .from('student_answers')
    .select(`
      *,
      question:questions!inner(
        id,
        question_text,
        question_type,
        points
      )
    `)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  return {
    id: submission.id,
    assessment: {
      id: submission.assessment.id,
      title: submission.assessment.title,
      type: submission.assessment.type,
      total_points: submission.assessment.total_points,
      instructions: submission.assessment.instructions
    },
    student: {
      id: submission.student.id,
      full_name: submission.student.profile.full_name,
      lrn: submission.student.lrn,
      avatar_url: submission.student.profile.avatar_url
    },
    score: submission.score,
    submitted_at: submission.submitted_at,
    graded_at: submission.graded_at,
    feedback: submission.feedback,
    status: submission.status,
    attempt_number: submission.attempt_number,
    answers: answers?.map(a => ({
      id: a.id,
      question_id: a.question_id,
      question_text: a.question.question_text,
      question_type: a.question.question_type,
      points: a.question.points,
      selected_option_id: a.selected_option_id,
      text_answer: a.text_answer,
      is_correct: a.is_correct,
      points_earned: a.points_earned
    })) || []
  } as SubmissionDetail
}

/**
 * Get question banks for a course
 */
export async function getQuestionBanks(courseId: string, teacherId: string) {
  const supabase = await createClient()

  // Verify access
  const hasAccess = await verifyTeacherAssessmentAccess(teacherId, courseId)
  if (!hasAccess) return []

  const { data, error } = await supabase
    .from('teacher_question_banks')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching question banks:', error)
    return []
  }

  // Enrich with question counts
  const enriched = await Promise.all(
    data.map(async (bank) => {
      const count = await getQuestionCountForBank(bank.id)
      return {
        ...bank,
        question_count: count
      } as QuestionBank
    })
  )

  return enriched
}

// Helper functions
async function getSubmissionCount(assessmentId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
  return count || 0
}

async function getGradedCount(assessmentId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('status', 'graded')
  return count || 0
}

async function checkSubmissionHasRubricScore(submissionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_rubric_scores')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
  return (count || 0) > 0
}

async function checkSubmissionHasFeedback(submissionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
  return (count || 0) > 0
}

async function getQuestionCountForBank(bankId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_bank_questions')
    .select('*', { count: 'exact', head: true })
    .eq('bank_id', bankId)
  return count || 0
}

async function verifyTeacherAssessmentAccess(teacherId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)
  return (count || 0) > 0
}

function determineAssessmentStatus(assessment: any): 'draft' | 'published' | 'closed' {
  if (!assessment.due_date) return 'published'
  const dueDate = new Date(assessment.due_date)
  const now = new Date()
  if (now > dueDate) return 'closed'
  return 'published'
}
