/**
 * Grading Queue Data Access Layer
 * Handles all database operations for the teacher grading queue
 */

import { createClient } from '@/lib/supabase/server'

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
  status: 'pending' | 'graded' | 'flagged'
  priority: number
  graded_by: string | null
  graded_at: string | null
  created_at: string
  // Joined data
  student_name?: string
  student_id?: string
  student_lrn?: string
  assessment_id?: string
  assessment_title?: string
  course_name?: string
  section_name?: string
  submitted_at?: string
}

export interface GradingQueueFilters {
  status?: 'pending' | 'graded' | 'flagged' | 'all'
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
 * Verify teacher has access to grade items for their courses
 */
async function verifyTeacherQueueAccess(teacherId: string, queueItemId: string): Promise<boolean> {
  const supabase = await createClient()

  // Get the queue item with submission and assessment info
  const { data: queueItem } = await supabase
    .from('teacher_grading_queue')
    .select(`
      id,
      submission:submissions!inner(
        assessment_id,
        assessments!inner(
          course_id
        )
      )
    `)
    .eq('id', queueItemId)
    .single()

  if (!queueItem) return false

  // Extract course_id from nested relation
  const submission = queueItem.submission as unknown as { assessments: { course_id: string } }
  const courseId = submission.assessments.course_id

  // Check if teacher is assigned to this course
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)

  return (count || 0) > 0
}

// ============================================
// Queue Operations
// ============================================

/**
 * Get grading queue items for a teacher
 */
export async function getGradingQueue(
  teacherId: string,
  filters?: GradingQueueFilters,
  limit: number = 50,
  offset: number = 0
): Promise<GradingQueueItem[]> {
  const supabase = await createClient()

  // Get teacher's courses first
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  // Build the query
  let query = supabase
    .from('teacher_grading_queue')
    .select(`
      *,
      submission:submissions!inner(
        id,
        submitted_at,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name)
        ),
        assessment:assessments!inner(
          id,
          title,
          course_id,
          course:courses!inner(
            name,
            section:sections!inner(name)
          )
        )
      )
    `)
    .in('submission.assessment.course_id', courseIds)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.assessmentId) {
    query = query.eq('submission.assessment_id', filters.assessmentId)
  }

  if (filters?.courseId) {
    query = query.eq('submission.assessment.course_id', filters.courseId)
  }

  if (filters?.questionType) {
    query = query.eq('question_type', filters.questionType)
  }

  if (filters?.studentId) {
    query = query.eq('submission.student_id', filters.studentId)
  }

  if (filters?.submissionId) {
    query = query.eq('submission_id', filters.submissionId)
  }

  if (filters?.priority === 'high') {
    query = query.gte('priority', 1)
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching grading queue:', error)
    return []
  }

  // Transform the data
  return data.map(item => ({
    id: item.id,
    submission_id: item.submission_id,
    question_id: item.question_id,
    question_type: item.question_type,
    question_text: item.question_text,
    student_response: item.student_response,
    max_points: item.max_points,
    points_awarded: item.points_awarded,
    feedback: item.feedback,
    rubric_json: item.rubric_json,
    status: item.status,
    priority: item.priority,
    graded_by: item.graded_by,
    graded_at: item.graded_at,
    created_at: item.created_at,
    // Joined data
    student_name: item.submission?.student?.profile?.full_name,
    student_id: item.submission?.student?.id,
    student_lrn: item.submission?.student?.lrn,
    assessment_id: item.submission?.assessment?.id,
    assessment_title: item.submission?.assessment?.title,
    course_name: item.submission?.assessment?.course?.name,
    section_name: item.submission?.assessment?.course?.section?.name,
    submitted_at: item.submission?.submitted_at
  })) as GradingQueueItem[]
}

/**
 * Get a single queue item with full details
 */
export async function getQueueItem(itemId: string): Promise<GradingQueueItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_grading_queue')
    .select(`
      *,
      submission:submissions!inner(
        id,
        submitted_at,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name, avatar_url)
        ),
        assessment:assessments!inner(
          id,
          title,
          type,
          total_points,
          course_id,
          course:courses!inner(
            name,
            section:sections!inner(name)
          )
        )
      )
    `)
    .eq('id', itemId)
    .single()

  if (error || !data) {
    console.error('Error fetching queue item:', error)
    return null
  }

  return {
    id: data.id,
    submission_id: data.submission_id,
    question_id: data.question_id,
    question_type: data.question_type,
    question_text: data.question_text,
    student_response: data.student_response,
    max_points: data.max_points,
    points_awarded: data.points_awarded,
    feedback: data.feedback,
    rubric_json: data.rubric_json,
    status: data.status,
    priority: data.priority,
    graded_by: data.graded_by,
    graded_at: data.graded_at,
    created_at: data.created_at,
    student_name: data.submission?.student?.profile?.full_name,
    student_id: data.submission?.student?.id,
    student_lrn: data.submission?.student?.lrn,
    assessment_id: data.submission?.assessment?.id,
    assessment_title: data.submission?.assessment?.title,
    course_name: data.submission?.assessment?.course?.name,
    section_name: data.submission?.assessment?.course?.section?.name,
    submitted_at: data.submission?.submitted_at
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
  const supabase = await createClient()

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

  // Update the queue item
  const { error: updateError } = await supabase
    .from('teacher_grading_queue')
    .update({
      points_awarded: input.points,
      feedback: input.feedback || null,
      graded_by: teacherId,
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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
 * Get the next item in the queue to grade
 */
export async function getNextQueueItem(
  teacherId: string,
  currentItemId?: string
): Promise<GradingQueueItem | null> {
  const supabase = await createClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return null

  const courseIds = assignments.map(a => a.course_id)

  let query = supabase
    .from('teacher_grading_queue')
    .select(`
      *,
      submission:submissions!inner(
        id,
        submitted_at,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name)
        ),
        assessment:assessments!inner(
          id,
          title,
          course_id,
          course:courses!inner(
            name,
            section:sections!inner(name)
          )
        )
      )
    `)
    .in('submission.assessment.course_id', courseIds)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  // Exclude current item if provided
  if (currentItemId) {
    query = query.neq('id', currentItemId)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    submission_id: data.submission_id,
    question_id: data.question_id,
    question_type: data.question_type,
    question_text: data.question_text,
    student_response: data.student_response,
    max_points: data.max_points,
    points_awarded: data.points_awarded,
    feedback: data.feedback,
    rubric_json: data.rubric_json,
    status: data.status,
    priority: data.priority,
    graded_by: data.graded_by,
    graded_at: data.graded_at,
    created_at: data.created_at,
    student_name: data.submission?.student?.profile?.full_name,
    student_id: data.submission?.student?.id,
    student_lrn: data.submission?.student?.lrn,
    assessment_id: data.submission?.assessment?.id,
    assessment_title: data.submission?.assessment?.title,
    course_name: data.submission?.assessment?.course?.name,
    section_name: data.submission?.assessment?.course?.section?.name,
    submitted_at: data.submission?.submitted_at
  }
}

/**
 * Get queue statistics for a teacher
 */
export async function getQueueStats(teacherId: string): Promise<GradingQueueStats> {
  const supabase = await createClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return {
      pending: 0,
      graded: 0,
      flagged: 0,
      total: 0,
      byQuestionType: [],
      byAssessment: []
    }
  }

  const courseIds = assignments.map(a => a.course_id)

  // Get all queue items for these courses
  const { data: queueItems } = await supabase
    .from('teacher_grading_queue')
    .select(`
      status,
      question_type,
      submission:submissions!inner(
        assessment:assessments!inner(
          id,
          title,
          course_id
        )
      )
    `)
    .in('submission.assessment.course_id', courseIds)

  if (!queueItems) {
    return {
      pending: 0,
      graded: 0,
      flagged: 0,
      total: 0,
      byQuestionType: [],
      byAssessment: []
    }
  }

  // Calculate stats
  let pending = 0
  let graded = 0
  let flagged = 0
  const questionTypeCount = new Map<string, number>()
  const assessmentCount = new Map<string, { id: string; title: string; count: number }>()

  for (const item of queueItems) {
    // Status counts
    if (item.status === 'pending') pending++
    else if (item.status === 'graded') graded++
    else if (item.status === 'flagged') flagged++

    // Question type counts (for pending only)
    if (item.status === 'pending') {
      const typeCount = questionTypeCount.get(item.question_type) || 0
      questionTypeCount.set(item.question_type, typeCount + 1)

      // Assessment counts - extract from nested relation
      const submission = item.submission as unknown as {
        assessment: { id: string; title: string; course_id: string }
      }
      const assessmentId = submission?.assessment?.id
      const assessmentTitle = submission?.assessment?.title

      if (assessmentId) {
        const existing = assessmentCount.get(assessmentId)
        if (existing) {
          existing.count++
        } else {
          assessmentCount.set(assessmentId, {
            id: assessmentId,
            title: assessmentTitle || 'Unknown',
            count: 1
          })
        }
      }
    }
  }

  return {
    pending,
    graded,
    flagged,
    total: queueItems.length,
    byQuestionType: Array.from(questionTypeCount.entries()).map(([type, count]) => ({
      type,
      count
    })),
    byAssessment: Array.from(assessmentCount.values())
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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
 * Get assessments with pending grading for dropdown filter
 */
export async function getAssessmentsWithPendingGrading(teacherId: string): Promise<{
  id: string
  title: string
  pending_count: number
}[]> {
  const supabase = await createClient()

  // Get teacher's courses
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  // Get assessments with pending queue items
  const { data: queueItems } = await supabase
    .from('teacher_grading_queue')
    .select(`
      submission:submissions!inner(
        assessment:assessments!inner(
          id,
          title,
          course_id
        )
      )
    `)
    .in('submission.assessment.course_id', courseIds)
    .eq('status', 'pending')

  if (!queueItems) return []

  // Aggregate by assessment
  const assessmentMap = new Map<string, { id: string; title: string; pending_count: number }>()

  for (const item of queueItems) {
    // Extract assessment from nested relation
    const submission = item.submission as unknown as {
      assessment: { id: string; title: string; course_id: string }
    }
    const assessmentId = submission?.assessment?.id
    const assessmentTitle = submission?.assessment?.title

    if (assessmentId) {
      const existing = assessmentMap.get(assessmentId)
      if (existing) {
        existing.pending_count++
      } else {
        assessmentMap.set(assessmentId, {
          id: assessmentId,
          title: assessmentTitle || 'Unknown',
          pending_count: 1
        })
      }
    }
  }

  return Array.from(assessmentMap.values())
}
