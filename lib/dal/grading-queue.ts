/**
 * Grading Queue Data Access Layer
 * Handles all database operations for the teacher grading queue
 *
 * IMPORTANT: No FK joins anywhere in this file (BUG-001).
 * All related data is fetched with flat selects + separate queries,
 * then enriched in JavaScript using Maps.
 */

import { createServiceClient } from '@/lib/supabase/service'

// ============================================
// Types
// ============================================

export interface GradingQueueItem {
  id: string
  submission_id: string
  question_id: string
  question_type: string
  question_text: string | null
  student_response: string | null
  max_points: number
  points_awarded: number | null
  feedback: string | null
  rubric_json: any | null
  status: 'pending' | 'graded' | 'flagged' | 'completed' | 'in_review'
  priority: number
  graded_by: string | null
  graded_at: string | null
  created_at: string
  // Enriched data
  student_name?: string | null
  student_id?: string | null
  student_lrn?: string | null
  assessment_id?: string | null
  assessment_title?: string | null
  course_name?: string | null
  section_name?: string | null
  submitted_at?: string | null
}

export interface GradingQueueFilters {
  status?: 'pending' | 'graded' | 'flagged' | 'completed' | 'in_review' | 'all'
  assessmentId?: string
  courseId?: string
  questionType?: string
  studentId?: string
  submissionId?: string
  priority?: 'high' | 'normal' | 'all'
}

export interface GradingQueueStats {
  pending: number
  graded: number
  flagged: number
  total: number
  byQuestionType: { type: string; count: number }[]
  byAssessment: { id: string; title: string; count: number }[]
}

export interface GradeItemInput {
  points: number
  feedback?: string
}

export interface FlagItemInput {
  reason: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Verify teacher has access to grade items for their courses.
 * Flat chain: queue → submission → assessment → teacher_assignments
 */
async function verifyTeacherQueueAccess(teacherId: string, queueItemId: string): Promise<boolean> {
  const supabase = createServiceClient()

  // Step 1: Get submission_id from queue item
  const { data: queueItem } = await supabase
    .from('teacher_grading_queue')
    .select('submission_id')
    .eq('id', queueItemId)
    .single()

  if (!queueItem) return false

  // Step 2: Get assessment_id from submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('assessment_id')
    .eq('id', queueItem.submission_id)
    .single()

  if (!submission) return false

  // Step 3: Get course_id from assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('course_id')
    .eq('id', submission.assessment_id)
    .single()

  if (!assessment) return false

  // Step 4: Check teacher assignment
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', assessment.course_id)

  return (count || 0) > 0
}

// ============================================
// Queue Operations
// ============================================

/**
 * Get grading queue items for a teacher.
 * All related data fetched with flat selects + Maps (no FK joins).
 */
export async function getGradingQueue(
  teacherId: string,
  filters?: GradingQueueFilters,
  limit: number = 50,
  offset: number = 0
): Promise<GradingQueueItem[]> {
  const supabase = createServiceClient()

  // Step 1: Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id as string)

  // Step 2: Get assessments for those courses
  let assessmentQuery = supabase
    .from('assessments')
    .select('id, title, course_id')
    .in('course_id', courseIds)

  if (filters?.assessmentId) {
    assessmentQuery = assessmentQuery.eq('id', filters.assessmentId)
  }

  const { data: assessments } = await assessmentQuery

  if (!assessments || assessments.length === 0) return []

  const assessmentIds = assessments.map(a => a.id as string)
  const assessmentMap = new Map(
    assessments.map(a => [a.id as string, { id: a.id as string, title: a.title as string, course_id: a.course_id as string }])
  )

  // Step 3: Get submissions for those assessments
  let submissionQuery = supabase
    .from('submissions')
    .select('id, student_id, submitted_at, assessment_id')
    .in('assessment_id', assessmentIds)

  if (filters?.submissionId) {
    submissionQuery = submissionQuery.eq('id', filters.submissionId)
  }

  if (filters?.studentId) {
    submissionQuery = submissionQuery.eq('student_id', filters.studentId)
  }

  const { data: submissions } = await submissionQuery

  if (!submissions || submissions.length === 0) return []

  const submissionIds = submissions.map(s => s.id as string)
  const submissionMap = new Map(
    submissions.map(s => [
      s.id as string,
      {
        student_id: s.student_id as string,
        submitted_at: s.submitted_at as string,
        assessment_id: s.assessment_id as string,
      },
    ])
  )

  // Step 4: Query teacher_grading_queue with filters
  let queueQuery = supabase
    .from('teacher_grading_queue')
    .select('*')
    .in('submission_id', submissionIds)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (filters?.status && filters.status !== 'all') {
    queueQuery = queueQuery.eq('status', filters.status)
  } else {
    // 'all' tab: exclude 'completed' items (they've been fully released)
    queueQuery = queueQuery.not('status', 'eq', 'completed')
  }

  if (filters?.questionType) {
    queueQuery = queueQuery.eq('question_type', filters.questionType)
  }

  if (filters?.priority === 'high') {
    queueQuery = queueQuery.gte('priority', 1)
  }

  const { data: items, error } = await queueQuery

  if (error || !items || items.length === 0) {
    if (error) console.error('Error fetching grading queue:', error)
    return []
  }

  // Step 5: Enrich with student and course data

  // Collect unique student IDs from submissions referenced by queue items
  const referencedSubmissionIds = new Set(items.map(i => i.submission_id as string))
  const uniqueStudentIds = Array.from(
    new Set(
      Array.from(referencedSubmissionIds)
        .map(sid => submissionMap.get(sid)?.student_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  // Fetch students
  let studentMap = new Map<string, { profile_id: string; lrn: string | null }>()
  if (uniqueStudentIds.length > 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id, profile_id, lrn')
      .in('id', uniqueStudentIds)

    if (students) {
      for (const s of students) {
        studentMap.set(s.id as string, { profile_id: s.profile_id as string, lrn: s.lrn as string | null })
      }
    }
  }

  // Fetch school_profiles for full names
  const uniqueProfileIds = Array.from(
    new Set(Array.from(studentMap.values()).map(s => s.profile_id).filter(Boolean))
  )
  let profileMap = new Map<string, string>()
  if (uniqueProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('school_profiles')
      .select('id, full_name')
      .in('id', uniqueProfileIds)

    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id as string, p.full_name as string)
      }
    }
  }

  // Fetch courses for names
  const uniqueCourseIds = Array.from(
    new Set(
      Array.from(assessmentMap.values()).map(a => a.course_id).filter(Boolean)
    )
  )
  let courseMap = new Map<string, string>()
  if (uniqueCourseIds.length > 0) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', uniqueCourseIds)

    if (courses) {
      for (const c of courses) {
        courseMap.set(c.id as string, c.name as string)
      }
    }
  }

  // Step 6: Build final result
  return items.map(item => {
    const sub = submissionMap.get(item.submission_id as string)
    const student = sub ? studentMap.get(sub.student_id) : undefined
    const profile_id = student?.profile_id
    const assessment = sub ? assessmentMap.get(sub.assessment_id) : undefined

    return {
      id: item.id as string,
      submission_id: item.submission_id as string,
      question_id: item.question_id as string,
      question_type: item.question_type as string,
      question_text: item.question_text as string | null,
      student_response: item.student_response as string | null,
      max_points: item.max_points as number,
      points_awarded: item.points_awarded as number | null,
      feedback: item.feedback as string | null,
      rubric_json: item.rubric_json ?? null,
      status: item.status as GradingQueueItem['status'],
      priority: item.priority as number,
      graded_by: item.graded_by as string | null,
      graded_at: item.graded_at as string | null,
      created_at: item.created_at as string,
      student_name: profile_id ? profileMap.get(profile_id) || null : null,
      student_id: sub?.student_id || null,
      student_lrn: student?.lrn || null,
      assessment_id: assessment?.id || null,
      assessment_title: assessment?.title || null,
      course_name: assessment ? courseMap.get(assessment.course_id) || null : null,
      section_name: null, // omitted — not critical for queue display
      submitted_at: sub?.submitted_at || null,
    }
  })
}

/**
 * Get a single queue item with full details.
 * Flat sequential fetches — no FK joins.
 */
export async function getQueueItem(itemId: string): Promise<GradingQueueItem | null> {
  const supabase = createServiceClient()

  // Step 1: Fetch queue item
  const { data: item, error } = await supabase
    .from('teacher_grading_queue')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error || !item) {
    console.error('Error fetching queue item:', error)
    return null
  }

  // Step 2: Fetch submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('student_id, submitted_at, assessment_id')
    .eq('id', item.submission_id as string)
    .single()

  if (!submission) {
    return {
      id: item.id as string,
      submission_id: item.submission_id as string,
      question_id: item.question_id as string,
      question_type: item.question_type as string,
      question_text: item.question_text as string | null,
      student_response: item.student_response as string | null,
      max_points: item.max_points as number,
      points_awarded: item.points_awarded as number | null,
      feedback: item.feedback as string | null,
      rubric_json: item.rubric_json ?? null,
      status: item.status as 'pending' | 'graded' | 'flagged',
      priority: item.priority as number,
      graded_by: item.graded_by as string | null,
      graded_at: item.graded_at as string | null,
      created_at: item.created_at as string,
      student_name: null,
      student_id: null,
      student_lrn: null,
      assessment_id: null,
      assessment_title: null,
      course_name: null,
      section_name: null,
      submitted_at: null,
    }
  }

  // Step 3: Fetch student
  const { data: student } = await supabase
    .from('students')
    .select('profile_id, lrn')
    .eq('id', submission.student_id as string)
    .single()

  // Step 4: Fetch school_profile for full name
  let fullName: string | null = null
  if (student?.profile_id) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name')
      .eq('id', student.profile_id as string)
      .single()
    fullName = (profile?.full_name as string) || null
  }

  // Step 5: Fetch assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, course_id')
    .eq('id', submission.assessment_id as string)
    .single()

  // Step 6: Fetch course
  let courseName: string | null = null
  if (assessment?.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', assessment.course_id as string)
      .single()
    courseName = (course?.name as string) || null
  }

  return {
    id: item.id as string,
    submission_id: item.submission_id as string,
    question_id: item.question_id as string,
    question_type: item.question_type as string,
    question_text: item.question_text as string | null,
    student_response: item.student_response as string | null,
    max_points: item.max_points as number,
    points_awarded: item.points_awarded as number | null,
    feedback: item.feedback as string | null,
    rubric_json: item.rubric_json ?? null,
    status: item.status as 'pending' | 'graded' | 'flagged',
    priority: item.priority as number,
    graded_by: item.graded_by as string | null,
    graded_at: item.graded_at as string | null,
    created_at: item.created_at as string,
    student_name: fullName,
    student_id: (submission.student_id as string) || null,
    student_lrn: (student?.lrn as string | null) || null,
    assessment_id: (assessment?.id as string) || null,
    assessment_title: (assessment?.title as string) || null,
    course_name: courseName,
    section_name: null,
    submitted_at: (submission.submitted_at as string) || null,
  }
}

/**
 * Grade a queue item
 */
export async function gradeQueueItem(
  itemId: string,
  teacherId: string,
  input: GradeItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Verify access
  const hasAccess = await verifyTeacherQueueAccess(teacherId, itemId)
  if (!hasAccess) {
    return { success: false, error: 'Access denied' }
  }

  // Get the queue item to check max points
  const { data: queueItem } = await supabase
    .from('teacher_grading_queue')
    .select('max_points, submission_id, question_id')
    .eq('id', itemId)
    .single()

  if (!queueItem) {
    return { success: false, error: 'Queue item not found' }
  }

  // Validate points
  if (input.points < 0 || input.points > queueItem.max_points) {
    return { success: false, error: `Points must be between 0 and ${queueItem.max_points}` }
  }

  // Resolve teacher's school profile_id for the graded_by FK (references school_profiles)
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  // Update the queue item
  const { error: updateError } = await supabase
    .from('teacher_grading_queue')
    .update({
      points_awarded: input.points,
      feedback: input.feedback || null,
      graded_by: teacherProfile?.profile_id || teacherId,
      graded_at: new Date().toISOString(),
      status: 'graded'
    })
    .eq('id', itemId)

  if (updateError) {
    console.error('Error grading queue item:', updateError)
    return { success: false, error: 'Failed to save grade' }
  }

  // Update the corresponding student answer if it exists
  await supabase
    .from('student_answers')
    .update({
      points_earned: input.points,
      is_correct: input.points === queueItem.max_points
    })
    .eq('submission_id', queueItem.submission_id)
    .eq('question_id', queueItem.question_id)

  // Check if all queue items for this submission are graded
  await updateSubmissionGradeStatus(queueItem.submission_id)

  return { success: true }
}

/**
 * Flag a queue item for review
 */
export async function flagQueueItem(
  itemId: string,
  teacherId: string,
  input: FlagItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Verify access
  const hasAccess = await verifyTeacherQueueAccess(teacherId, itemId)
  if (!hasAccess) {
    return { success: false, error: 'Access denied' }
  }

  const { error } = await supabase
    .from('teacher_grading_queue')
    .update({
      status: 'flagged',
      feedback: input.reason
    })
    .eq('id', itemId)

  if (error) {
    console.error('Error flagging queue item:', error)
    return { success: false, error: 'Failed to flag item' }
  }

  return { success: true }
}

/**
 * Unflag a queue item (set back to pending)
 */
export async function unflagQueueItem(
  itemId: string,
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const hasAccess = await verifyTeacherQueueAccess(teacherId, itemId)
  if (!hasAccess) {
    return { success: false, error: 'Access denied' }
  }

  const { error } = await supabase
    .from('teacher_grading_queue')
    .update({
      status: 'pending',
      feedback: null
    })
    .eq('id', itemId)

  if (error) {
    console.error('Error unflagging queue item:', error)
    return { success: false, error: 'Failed to unflag item' }
  }

  return { success: true }
}

/**
 * Get the next item in the queue to grade.
 * Reuses getGradingQueue with status='pending', limit=1.
 */
export async function getNextQueueItem(
  teacherId: string,
  currentItemId?: string
): Promise<GradingQueueItem | null> {
  const supabase = createServiceClient()

  // Step 1: Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return null

  const courseIds = assignments.map(a => a.course_id as string)

  // Step 2: Get assessment IDs for those courses
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title, course_id')
    .in('course_id', courseIds)

  if (!assessments || assessments.length === 0) return null

  const assessmentIds = assessments.map(a => a.id as string)
  const assessmentMap = new Map(
    assessments.map(a => [a.id as string, { id: a.id as string, title: a.title as string, course_id: a.course_id as string }])
  )

  // Step 3: Get submission IDs for those assessments
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, student_id, submitted_at, assessment_id')
    .in('assessment_id', assessmentIds)

  if (!submissions || submissions.length === 0) return null

  const submissionIds = submissions.map(s => s.id as string)
  const submissionMap = new Map(
    submissions.map(s => [
      s.id as string,
      {
        student_id: s.student_id as string,
        submitted_at: s.submitted_at as string,
        assessment_id: s.assessment_id as string,
      },
    ])
  )

  // Step 4: Get next pending queue item
  let queueQuery = supabase
    .from('teacher_grading_queue')
    .select('*')
    .in('submission_id', submissionIds)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  if (currentItemId) {
    queueQuery = queueQuery.neq('id', currentItemId)
  }

  const { data: items, error } = await queueQuery

  if (error || !items || items.length === 0) return null

  const item = items[0]

  // Step 5: Enrich the single item
  const sub = submissionMap.get(item.submission_id as string)

  let studentMap = new Map<string, { profile_id: string; lrn: string | null }>()
  let profileMap = new Map<string, string>()
  let courseMap = new Map<string, string>()

  if (sub?.student_id) {
    const { data: students } = await supabase
      .from('students')
      .select('id, profile_id, lrn')
      .in('id', [sub.student_id])

    if (students) {
      for (const s of students) {
        studentMap.set(s.id as string, { profile_id: s.profile_id as string, lrn: s.lrn as string | null })
      }
    }

    const profileIds = Array.from(studentMap.values()).map(s => s.profile_id).filter(Boolean)
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('school_profiles')
        .select('id, full_name')
        .in('id', profileIds)

      if (profiles) {
        for (const p of profiles) {
          profileMap.set(p.id as string, p.full_name as string)
        }
      }
    }
  }

  const assessment = sub ? assessmentMap.get(sub.assessment_id) : undefined
  if (assessment?.course_id) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', [assessment.course_id])

    if (courses) {
      for (const c of courses) {
        courseMap.set(c.id as string, c.name as string)
      }
    }
  }

  const student = sub ? studentMap.get(sub.student_id) : undefined
  const profile_id = student?.profile_id

  return {
    id: item.id as string,
    submission_id: item.submission_id as string,
    question_id: item.question_id as string,
    question_type: item.question_type as string,
    question_text: item.question_text as string | null,
    student_response: item.student_response as string | null,
    max_points: item.max_points as number,
    points_awarded: item.points_awarded as number | null,
    feedback: item.feedback as string | null,
    rubric_json: item.rubric_json ?? null,
    status: item.status as 'pending' | 'graded' | 'flagged',
    priority: item.priority as number,
    graded_by: item.graded_by as string | null,
    graded_at: item.graded_at as string | null,
    created_at: item.created_at as string,
    student_name: profile_id ? profileMap.get(profile_id) || null : null,
    student_id: sub?.student_id || null,
    student_lrn: student?.lrn || null,
    assessment_id: assessment?.id || null,
    assessment_title: assessment?.title || null,
    course_name: assessment ? courseMap.get(assessment.course_id) || null : null,
    section_name: null,
    submitted_at: sub?.submitted_at || null,
  }
}

/**
 * Get queue statistics for a teacher.
 * All aggregation done in JavaScript — no FK joins.
 */
export async function getQueueStats(teacherId: string): Promise<GradingQueueStats> {
  const supabase = createServiceClient()

  const emptyStats: GradingQueueStats = {
    pending: 0,
    graded: 0,
    flagged: 0,
    total: 0,
    byQuestionType: [],
    byAssessment: [],
  }

  // Step 1: Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return emptyStats

  const courseIds = assignments.map(a => a.course_id as string)

  // Step 2: Get assessment IDs for those courses
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id')
    .in('course_id', courseIds)

  if (!assessments || assessments.length === 0) return emptyStats

  const assessmentIds = assessments.map(a => a.id as string)

  // Step 3: Get submissions for those assessments
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, assessment_id')
    .in('assessment_id', assessmentIds)

  if (!submissions || submissions.length === 0) return emptyStats

  const submissionIds = submissions.map(s => s.id as string)
  // Build submissionId → assessmentId map
  const submissionToAssessment = new Map(
    submissions.map(s => [s.id as string, s.assessment_id as string])
  )

  // Step 4: Get all queue items for those submissions
  const { data: queueItems } = await supabase
    .from('teacher_grading_queue')
    .select('id, status, question_type, submission_id')
    .in('submission_id', submissionIds)

  if (!queueItems) return emptyStats

  // Step 5: Aggregate in JavaScript
  let pending = 0
  let graded = 0
  let flagged = 0
  const questionTypeCount = new Map<string, number>()
  const assessmentPendingCount = new Map<string, number>()

  for (const item of queueItems) {
    const status = item.status as string
    if (status === 'pending') pending++
    else if (status === 'graded' || status === 'completed') graded++
    else if (status === 'flagged') flagged++

    if (status === 'pending') {
      const qtype = item.question_type as string
      questionTypeCount.set(qtype, (questionTypeCount.get(qtype) || 0) + 1)

      const assessmentId = submissionToAssessment.get(item.submission_id as string)
      if (assessmentId) {
        assessmentPendingCount.set(assessmentId, (assessmentPendingCount.get(assessmentId) || 0) + 1)
      }
    }
  }

  // Step 6: Fetch titles for assessments with pending items
  const pendingAssessmentIds = Array.from(assessmentPendingCount.keys())
  let assessmentTitleMap = new Map<string, string>()
  if (pendingAssessmentIds.length > 0) {
    const { data: pendingAssessments } = await supabase
      .from('assessments')
      .select('id, title')
      .in('id', pendingAssessmentIds)

    if (pendingAssessments) {
      for (const a of pendingAssessments) {
        assessmentTitleMap.set(a.id as string, a.title as string)
      }
    }
  }

  return {
    pending,
    graded,
    flagged,
    total: queueItems.length,
    byQuestionType: Array.from(questionTypeCount.entries()).map(([type, count]) => ({ type, count })),
    byAssessment: Array.from(assessmentPendingCount.entries()).map(([id, count]) => ({
      id,
      title: assessmentTitleMap.get(id) || 'Unknown',
      count,
    })),
  }
}

/**
 * Get question details with answer key for reference
 */
export async function getQuestionDetails(questionId: string): Promise<{
  question_text: string
  question_type: string
  choices_json: any
  answer_key_json: any
  points: number
} | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('teacher_assessment_questions')
    .select('question_text, question_type, choices_json, answer_key_json, points')
    .eq('id', questionId)
    .single()

  if (error || !data) {
    console.error('Error fetching question details:', error)
    return null
  }

  return data
}

/**
 * Batch grade multiple queue items
 */
export async function batchGradeItems(
  items: { itemId: string; points: number; feedback?: string }[],
  teacherId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const item of items) {
    const result = await gradeQueueItem(item.itemId, teacherId, {
      points: item.points,
      feedback: item.feedback
    })

    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`Item ${item.itemId}: ${result.error}`)
    }
  }

  return { success, failed, errors }
}

/**
 * Update submission status after grading queue items
 */
async function updateSubmissionGradeStatus(submissionId: string): Promise<void> {
  const supabase = createServiceClient()

  // Check if there are any pending items left
  const { count: pendingCount } = await supabase
    .from('teacher_grading_queue')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
    .eq('status', 'pending')

  if (pendingCount === 0) {
    // All items graded - calculate total score
    const { data: gradedItems } = await supabase
      .from('teacher_grading_queue')
      .select('points_awarded')
      .eq('submission_id', submissionId)
      .eq('status', 'graded')

    // Get current submission score (from auto-graded questions)
    const { data: submission } = await supabase
      .from('submissions')
      .select('score')
      .eq('id', submissionId)
      .single()

    // Add manual grading points
    const manualPoints = gradedItems?.reduce((sum, item) => sum + (item.points_awarded || 0), 0) || 0
    const totalScore = (submission?.score || 0) + manualPoints

    // Update submission as fully graded
    await supabase
      .from('submissions')
      .update({
        score: totalScore,
        status: 'graded',
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId)
  }
}

/**
 * Get grading history for a teacher
 */
export async function getGradingHistory(
  teacherId: string,
  limit: number = 20
): Promise<GradingQueueItem[]> {
  return getGradingQueue(
    teacherId,
    { status: 'graded' },
    limit,
    0
  )
}

/**
 * Get assessments with pending grading for dropdown filter.
 * Flat selects + JS aggregation — no FK joins.
 */
export async function getAssessmentsWithPendingGrading(teacherId: string): Promise<{
  id: string
  title: string
  pending_count: number
}[]> {
  const supabase = createServiceClient()

  // Step 1: Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id as string)

  // Step 2: Get assessments for those courses
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title')
    .in('course_id', courseIds)

  if (!assessments || assessments.length === 0) return []

  const assessmentIds = assessments.map(a => a.id as string)
  const assessmentTitleMap = new Map(
    assessments.map(a => [a.id as string, a.title as string])
  )

  // Step 3: Get submission IDs for those assessments
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, assessment_id')
    .in('assessment_id', assessmentIds)

  if (!submissions || submissions.length === 0) return []

  const submissionIds = submissions.map(s => s.id as string)
  // Build submissionId → assessmentId map
  const submissionToAssessment = new Map(
    submissions.map(s => [s.id as string, s.assessment_id as string])
  )

  // Step 4: Get pending queue items for those submissions
  const { data: pendingItems } = await supabase
    .from('teacher_grading_queue')
    .select('submission_id')
    .in('submission_id', submissionIds)
    .eq('status', 'pending')

  if (!pendingItems) return []

  // Step 5: Aggregate pending count per assessment in JavaScript
  const assessmentPendingCount = new Map<string, number>()
  for (const item of pendingItems) {
    const assessmentId = submissionToAssessment.get(item.submission_id as string)
    if (assessmentId) {
      assessmentPendingCount.set(assessmentId, (assessmentPendingCount.get(assessmentId) || 0) + 1)
    }
  }

  return Array.from(assessmentPendingCount.entries())
    .filter(([, count]) => count > 0)
    .map(([id, pending_count]) => ({
      id,
      title: assessmentTitleMap.get(id) || 'Unknown',
      pending_count,
    }))
}
