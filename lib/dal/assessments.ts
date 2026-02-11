import { createServiceClient } from '@/lib/supabase/service'

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

export type Submission = {
  id: string
  assessment_id: string
  assessment_title: string
  student_id: string
  student_name: string
  student_lrn: string
  score: number | null
  status: 'submitted' | 'graded' | 'returned' | 'released'
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
  ai_score?: number | null
  ai_feedback?: string | null
  ai_graded_at?: string | null
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
export async function getTeacherAssessments(teacherId: string, filters?: {
  type?: string
  status?: string
}) {
  const supabase = createServiceClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  let query = supabase
    .from('assessments')
    .select('*')
    .in('course_id', courseIds)

  // Apply type filter
  if (filters?.type) {
    if (filters.type === 'exam') {
      // 'exam' includes both midterm and final
      query = query.in('type', ['midterm', 'final'])
    } else {
      query = query.eq('type', filters.type)
    }
  }

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching assessments:', error)
    return []
  }

  // Fetch courses and sections separately (no FK joins)
  const uniqueCourseIds = [...new Set(data.map(a => a.course_id))]
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, section_id')
    .in('id', uniqueCourseIds)

  const courseMap = new Map(courses?.map(c => [c.id, c]) || [])

  const uniqueSectionIds = [...new Set(courses?.map(c => c.section_id).filter(Boolean) || [])]
  const sectionMap = new Map<string, string>()
  if (uniqueSectionIds.length > 0) {
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name')
      .in('id', uniqueSectionIds)
    sections?.forEach(s => sectionMap.set(s.id, s.name))
  }

  // Enrich with submission counts
  const enriched = await Promise.all(
    data.map(async (assessment) => {
      const [submissionCount, gradedCount] = await Promise.all([
        getSubmissionCount(assessment.id),
        getGradedCount(assessment.id)
      ])

      const course = courseMap.get(assessment.course_id)

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
        course_name: course?.name || 'Unknown Course',
        section_name: course?.section_id ? (sectionMap.get(course.section_id) || 'Unknown Section') : 'No Section',
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
  const supabase = createServiceClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  // Get assessment IDs for teacher's courses
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title, type, course_id')
    .in('course_id', filters?.courseId ? [filters.courseId] : courseIds)

  if (!assessments || assessments.length === 0) return []

  const assessmentIds = assessments.map(a => a.id)
  const assessmentMap = new Map(assessments.map(a => [a.id, a]))

  let query = supabase
    .from('submissions')
    .select('*')
    .in('assessment_id', filters?.assessmentId ? [filters.assessmentId] : assessmentIds)
    .order('submitted_at', { ascending: true })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  // No default filter — return all statuses so the page can compute stats

  const { data, error } = await query

  if (error) {
    console.error('Error fetching submissions:', error)
    return []
  }

  // Fetch students and profiles separately (no FK joins)
  const uniqueStudentIds = [...new Set(data.map(s => s.student_id))]
  const studentMap = new Map<string, { id: string; lrn: string; profile_id: string }>()
  if (uniqueStudentIds.length > 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id, lrn, profile_id')
      .in('id', uniqueStudentIds)
    students?.forEach(s => studentMap.set(s.id, s))
  }

  const uniqueProfileIds = [...new Set([...studentMap.values()].map(s => s.profile_id).filter(Boolean))]
  const profileMap = new Map<string, string>()
  if (uniqueProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('school_profiles')
      .select('id, full_name')
      .in('id', uniqueProfileIds)
    profiles?.forEach(p => profileMap.set(p.id, p.full_name))
  }

  // Enrich submissions — check feedback from the submission's own feedback column
  // instead of querying separate tables per submission (much faster)
  const enriched = data.map((submission) => {
    const assessment = assessmentMap.get(submission.assessment_id)
    const student = studentMap.get(submission.student_id)
    const studentName = student?.profile_id ? (profileMap.get(student.profile_id) || 'Unknown Student') : 'Unknown Student'

    return {
      id: submission.id,
      assessment_id: submission.assessment_id,
      assessment_title: assessment?.title || 'Unknown Assessment',
      student_id: submission.student_id,
      student_name: studentName,
      student_lrn: student?.lrn || '',
      score: submission.score,
      status: submission.status,
      submitted_at: submission.submitted_at,
      graded_at: submission.graded_at,
      attempt_number: submission.attempt_number,
      has_rubric_score: submission.score !== null,
      has_feedback: !!submission.feedback
    } as Submission
  })

  return enriched
}

/**
 * Get detailed submission for grading
 */
export async function getSubmissionDetail(submissionId: string, teacherId: string) {
  const supabase = createServiceClient()

  // Fetch submission flat (no FK joins)
  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    console.error('Error fetching submission:', submissionError)
    return null
  }

  // Fetch assessment separately
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, type, total_points, instructions, course_id')
    .eq('id', submission.assessment_id)
    .single()

  if (!assessment) return null

  // Verify teacher access
  const hasAccess = await verifyTeacherAssessmentAccess(teacherId, assessment.course_id)
  if (!hasAccess) return null

  // Fetch student separately
  const { data: student } = await supabase
    .from('students')
    .select('id, lrn, profile_id')
    .eq('id', submission.student_id)
    .single()

  // Fetch student profile separately
  let fullName = 'Unknown Student'
  let avatarUrl: string | null = null
  if (student?.profile_id) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, avatar_url')
      .eq('id', student.profile_id)
      .single()
    if (profile) {
      fullName = profile.full_name
      avatarUrl = profile.avatar_url
    }
  }

  // Get answers flat (no FK joins)
  const { data: answers } = await supabase
    .from('student_answers')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  // Fetch questions separately, with fallback to teacher_assessment_questions
  const questionIds = [...new Set(answers?.map(a => a.question_id).filter(Boolean) || [])]
  const questionMap = new Map<string, { question_text: string; question_type: string; points: number }>()

  if (questionIds.length > 0) {
    // Try the questions table first
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, question_type, points')
      .in('id', questionIds)
    questions?.forEach(q => questionMap.set(q.id, q))

    // Fallback: for any question IDs not found, try teacher_assessment_questions
    const missingIds = questionIds.filter(id => !questionMap.has(id))
    if (missingIds.length > 0) {
      const { data: teacherQuestions } = await supabase
        .from('teacher_assessment_questions')
        .select('id, question_text, question_type, points')
        .in('id', missingIds)
      teacherQuestions?.forEach(q => questionMap.set(q.id, q))
    }
  }

  return {
    id: submission.id,
    assessment: {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      total_points: assessment.total_points,
      instructions: assessment.instructions
    },
    student: {
      id: student?.id || submission.student_id,
      full_name: fullName,
      lrn: student?.lrn || '',
      avatar_url: avatarUrl
    },
    score: submission.score,
    ai_score: submission.ai_score ?? null,
    ai_feedback: submission.ai_feedback ?? null,
    ai_graded_at: submission.ai_graded_at ?? null,
    submitted_at: submission.submitted_at,
    graded_at: submission.graded_at,
    feedback: submission.feedback,
    status: submission.status,
    attempt_number: submission.attempt_number,
    answers: answers?.map(a => {
      const question = questionMap.get(a.question_id)
      return {
        id: a.id,
        question_id: a.question_id,
        question_text: question?.question_text || 'Question not found',
        question_type: question?.question_type || 'unknown',
        points: question?.points || 0,
        selected_option_id: a.selected_option_id,
        text_answer: a.text_answer,
        is_correct: a.is_correct,
        points_earned: a.points_earned
      }
    }) || []
  } as SubmissionDetail
}

// Helper functions
async function getSubmissionCount(assessmentId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
  return count || 0
}

async function getGradedCount(assessmentId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('status', 'graded')
  return count || 0
}

async function checkSubmissionHasRubricScore(submissionId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('teacher_rubric_scores')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
  return (count || 0) > 0
}

async function checkSubmissionHasFeedback(submissionId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('teacher_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
  return (count || 0) > 0
}

async function verifyTeacherAssessmentAccess(teacherId: string, courseId: string): Promise<boolean> {
  const supabase = createServiceClient()
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

/**
 * Get assessment statistics for a teacher
 */
export async function getAssessmentStats(teacherId: string) {
  const supabase = createServiceClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return {
      totalAssessments: 0,
      pendingGrading: 0,
      graded: 0,
      upcomingDue: 0
    }
  }

  const courseIds = assignments.map(a => a.course_id)

  // Get total assessments count
  const { count: totalAssessments } = await supabase
    .from('assessments')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)

  // Get assessment IDs for submission queries
  const { data: assessmentIds } = await supabase
    .from('assessments')
    .select('id')
    .in('course_id', courseIds)

  const ids = assessmentIds?.map(a => a.id) || []

  // Get pending grading count (status = 'submitted')
  const { count: pendingGrading } = ids.length > 0 ? await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .in('assessment_id', ids)
    .eq('status', 'submitted') : { count: 0 }

  // Get graded count (status = 'graded')
  const { count: graded } = ids.length > 0 ? await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .in('assessment_id', ids)
    .eq('status', 'graded') : { count: 0 }

  // Get upcoming due assessments (due_date in the future, within 7 days)
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { count: upcomingDue } = await supabase
    .from('assessments')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)
    .gte('due_date', now.toISOString())
    .lte('due_date', weekFromNow.toISOString())

  return {
    totalAssessments: totalAssessments || 0,
    pendingGrading: pendingGrading || 0,
    graded: graded || 0,
    upcomingDue: upcomingDue || 0
  }
}
