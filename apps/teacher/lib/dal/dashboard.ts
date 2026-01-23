import { createClient } from '@/lib/supabase/server'

// ============================================================================
// DASHBOARD DATA TYPES
// ============================================================================

export type TeacherStats = {
  total_students: number
  active_courses: number
  pending_submissions: number
  graded_not_released: number
  draft_modules: number
}

export type TodaysLiveSession = {
  id: string
  title: string
  description: string | null
  scheduled_start: string
  scheduled_end: string | null
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  section_name: string
  course_name: string
  join_url: string | null
  is_live_now: boolean
  minutes_until_start: number | null
}

export type RecentSubmission = {
  id: string
  student_name: string
  student_lrn: string
  assessment_title: string
  assessment_type: string
  submitted_at: string
  time_ago: string
}

export type GradedNotReleasedItem = {
  id: string
  assessment_id: string
  assessment_title: string
  course_name: string
  graded_count: number
  graded_at: string
}

export type DraftModule = {
  id: string
  title: string
  course_name: string
  updated_at: string
  time_ago: string
}

export type AbsentStudent = {
  id: string
  full_name: string
  lrn: string
  section_name: string
  last_seen: string | null
}

export type UpcomingDeadline = {
  id: string
  title: string
  type: string
  course_name: string
  due_date: string
  days_until_due: number
  submission_count: number
}

export type ActivityItem = {
  id: string
  type: 'submission' | 'enrollment' | 'module_published' | 'message'
  description: string
  timestamp: string
  time_ago: string
  metadata: Record<string, any>
}

// ============================================================================
// TEACHER STATS
// ============================================================================

/**
 * Get overview statistics for teacher dashboard
 */
export async function getTeacherStats(teacherId: string): Promise<TeacherStats> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return {
      total_students: 0,
      active_courses: 0,
      pending_submissions: 0,
      graded_not_released: 0,
      draft_modules: 0
    }
  }

  const courseIds = assignments.map(a => a.course_id)

  // Get all stats in parallel
  const [
    totalStudents,
    activeCourses,
    pendingSubmissions,
    gradedNotReleased,
    draftModules
  ] = await Promise.all([
    getTotalStudentsCount(courseIds),
    getActiveCoursesCount(courseIds),
    getPendingSubmissionsCount(courseIds),
    getGradedNotReleasedCount(courseIds),
    getDraftModulesCount(courseIds)
  ])

  return {
    total_students: totalStudents,
    active_courses: activeCourses,
    pending_submissions: pendingSubmissions,
    graded_not_released: gradedNotReleased,
    draft_modules: draftModules
  }
}

// ============================================================================
// TODAY'S LIVE SESSIONS
// ============================================================================

/**
 * Get live sessions scheduled for today
 */
export async function getTodaysLiveSessions(teacherId: string): Promise<TodaysLiveSession[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  // Get today's date range
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data, error } = await supabase
    .from('teacher_live_sessions')
    .select(`
      id,
      title,
      description,
      scheduled_start,
      scheduled_end,
      status,
      join_url,
      section:sections!inner(name),
      course:courses!inner(name)
    `)
    .in('course_id', courseIds)
    .gte('scheduled_start', startOfDay)
    .lte('scheduled_start', endOfDay)
    .in('status', ['scheduled', 'live'])
    .order('scheduled_start', { ascending: true })

  if (error) {
    console.error('Error fetching today\'s sessions:', error)
    return []
  }

  const now = new Date()

  return (data || []).map((session: any) => {
    const scheduledStart = new Date(session.scheduled_start)
    const scheduledEnd = session.scheduled_end ? new Date(session.scheduled_end) : null

    const isLiveNow = session.status === 'live' ||
      (now >= scheduledStart && (!scheduledEnd || now <= scheduledEnd))

    const minutesUntilStart = isLiveNow ? 0 :
      Math.floor((scheduledStart.getTime() - now.getTime()) / (1000 * 60))

    return {
      id: session.id,
      title: session.title,
      description: session.description,
      scheduled_start: session.scheduled_start,
      scheduled_end: session.scheduled_end,
      status: session.status,
      section_name: session.section?.[0]?.name || session.section?.name || 'Unknown',
      course_name: session.course?.[0]?.name || session.course?.name || 'Unknown',
      join_url: session.join_url,
      is_live_now: isLiveNow,
      minutes_until_start: minutesUntilStart > 0 ? minutesUntilStart : null
    }
  })
}

// ============================================================================
// GRADING INBOX
// ============================================================================

/**
 * Get recent pending submissions for grading
 */
export async function getRecentPendingSubmissions(
  teacherId: string,
  limit: number = 3
): Promise<RecentSubmission[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      submitted_at,
      student:students!inner(
        lrn,
        profile:school_profiles!inner(full_name)
      ),
      assessment:assessments!inner(
        title,
        type,
        course_id
      )
    `)
    .in('assessment.course_id', courseIds)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent submissions:', error)
    return []
  }

  return (data || []).map((submission: any) => ({
    id: submission.id,
    student_name: submission.student?.profile?.[0]?.full_name || submission.student?.profile?.full_name || 'Unknown',
    student_lrn: submission.student?.lrn || 'Unknown',
    assessment_title: submission.assessment?.title || 'Unknown',
    assessment_type: submission.assessment?.type || 'Unknown',
    submitted_at: submission.submitted_at,
    time_ago: getTimeAgo(submission.submitted_at)
  }))
}

// ============================================================================
// GRADED NOT RELEASED
// ============================================================================

/**
 * Get assessments that are graded but not released to students
 */
export async function getGradedNotReleasedItems(teacherId: string): Promise<GradedNotReleasedItem[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  // Get submissions that are graded but not returned
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      graded_at,
      assessment:assessments!inner(
        id,
        title,
        course:courses!inner(name)
      )
    `)
    .in('assessment.course_id', courseIds)
    .eq('status', 'graded')
    .not('graded_at', 'is', null)
    .order('graded_at', { ascending: false })

  if (error) {
    console.error('Error fetching graded submissions:', error)
    return []
  }

  // Group by assessment
  const assessmentMap = new Map<string, GradedNotReleasedItem>()

  ;(data || []).forEach((submission: any) => {
    const assessmentId = submission.assessment?.id || submission.assessment?.[0]?.id
    const assessmentTitle = submission.assessment?.title || submission.assessment?.[0]?.title || 'Unknown'
    const courseName = submission.assessment?.course?.[0]?.name || submission.assessment?.course?.name || 'Unknown'

    if (!assessmentId) return

    if (!assessmentMap.has(assessmentId)) {
      assessmentMap.set(assessmentId, {
        id: submission.id,
        assessment_id: assessmentId,
        assessment_title: assessmentTitle,
        course_name: courseName,
        graded_count: 1,
        graded_at: submission.graded_at!
      })
    } else {
      const item = assessmentMap.get(assessmentId)!
      item.graded_count++
    }
  })

  return Array.from(assessmentMap.values())
}

// ============================================================================
// DRAFT MODULES
// ============================================================================

/**
 * Get unpublished draft modules
 */
export async function getDraftModules(teacherId: string, limit: number = 5): Promise<DraftModule[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  const { data, error } = await supabase
    .from('modules')
    .select(`
      id,
      title,
      updated_at,
      course:courses!inner(name)
    `)
    .in('course_id', courseIds)
    .eq('is_published', false)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching draft modules:', error)
    return []
  }

  return (data || []).map((module: any) => ({
    id: module.id,
    title: module.title,
    course_name: module.course?.[0]?.name || module.course?.name || 'Unknown',
    updated_at: module.updated_at,
    time_ago: getTimeAgo(module.updated_at)
  }))
}

// ============================================================================
// TODAY'S ABSENT STUDENTS
// ============================================================================

/**
 * Get students who haven't logged in today
 */
export async function getTodaysAbsentStudents(teacherId: string): Promise<AbsentStudent[]> {
  const supabase = await createClient()

  // Get teacher's sections
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('section:sections!inner(id)')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const sectionIds = assignments.map((a: any) => a.section?.[0]?.id || a.section?.id)

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Get students in teacher's sections
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      profile:school_profiles!inner(full_name),
      section:sections!inner(name)
    `)
    .in('section_id', sectionIds)

  if (!students) return []

  // Check attendance for each student
  const absentStudents: AbsentStudent[] = []

  for (const student of (students as any[] || [])) {
    const { data: attendance } = await supabase
      .from('teacher_daily_attendance')
      .select('status, first_seen_at')
      .eq('student_id', student.id)
      .eq('date', today)
      .single()

    if (!attendance || attendance.status === 'absent') {
      absentStudents.push({
        id: student.id,
        full_name: student.profile?.[0]?.full_name || student.profile?.full_name || 'Unknown',
        lrn: student.lrn || 'Unknown',
        section_name: student.section?.[0]?.name || student.section?.name || 'Unknown',
        last_seen: attendance?.first_seen_at || null
      })
    }
  }

  return absentStudents
}

// ============================================================================
// UPCOMING DEADLINES
// ============================================================================

/**
 * Get upcoming assessment deadlines in the next N days
 */
export async function getUpcomingDeadlines(
  teacherId: string,
  days: number = 7
): Promise<UpcomingDeadline[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id,
      title,
      type,
      due_date,
      course:courses!inner(name)
    `)
    .in('course_id', courseIds)
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', futureDate.toISOString())
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming deadlines:', error)
    return []
  }

  const enriched = await Promise.all(
    (data || []).map(async (assessment: any) => {
      const submissionCount = await getSubmissionCountForAssessment(assessment.id)
      const dueDate = new Date(assessment.due_date!)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        course_name: assessment.course?.[0]?.name || assessment.course?.name || 'Unknown',
        due_date: assessment.due_date!,
        days_until_due: daysUntilDue,
        submission_count: submissionCount
      }
    })
  )

  return enriched
}

// ============================================================================
// RECENT ACTIVITY FEED
// ============================================================================

/**
 * Get recent activity across all teacher's courses
 */
export async function getRecentActivity(
  teacherId: string,
  limit: number = 5
): Promise<ActivityItem[]> {
  const supabase = await createClient()

  // Get teacher's course IDs
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) return []

  const courseIds = assignments.map(a => a.course_id)

  const activities: ActivityItem[] = []

  // Get recent submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      submitted_at,
      student:students!inner(profile:school_profiles!inner(full_name)),
      assessment:assessments!inner(title, course_id)
    `)
    .in('assessment.course_id', courseIds)
    .order('submitted_at', { ascending: false })
    .limit(limit)

  if (submissions) {
    submissions.forEach((sub: any) => {
      activities.push({
        id: sub.id,
        type: 'submission',
        description: `${sub.student?.profile?.[0]?.full_name || sub.student?.profile?.full_name || 'Unknown'} submitted ${sub.assessment?.[0]?.title || sub.assessment?.title || 'Unknown'}`,
        timestamp: sub.submitted_at,
        time_ago: getTimeAgo(sub.submitted_at),
        metadata: { submission_id: sub.id }
      })
    })
  }

  // Get recent enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      student:students!inner(profile:school_profiles!inner(full_name)),
      course:courses!inner(name, id)
    `)
    .in('course_id', courseIds)
    .order('enrolled_at', { ascending: false })
    .limit(limit)

  if (enrollments) {
    enrollments.forEach((enr: any) => {
      activities.push({
        id: enr.id,
        type: 'enrollment',
        description: `${enr.student?.profile?.[0]?.full_name || enr.student?.profile?.full_name || 'Unknown'} enrolled in ${enr.course?.[0]?.name || enr.course?.name || 'Unknown'}`,
        timestamp: enr.enrolled_at,
        time_ago: getTimeAgo(enr.enrolled_at),
        metadata: { enrollment_id: enr.id }
      })
    })
  }

  // Get recently published modules
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id,
      title,
      updated_at,
      course:courses!inner(name, id)
    `)
    .in('course_id', courseIds)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (modules) {
    modules.forEach((mod: any) => {
      activities.push({
        id: mod.id,
        type: 'module_published',
        description: `Published "${mod.title}" in ${mod.course?.[0]?.name || mod.course?.name || 'Unknown'}`,
        timestamp: mod.updated_at,
        time_ago: getTimeAgo(mod.updated_at),
        metadata: { module_id: mod.id }
      })
    })
  }

  // Sort all activities by timestamp
  activities.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return activities.slice(0, limit)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getTotalStudentsCount(courseIds: string[]): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('enrollments')
    .select('student_id', { count: 'exact', head: true })
    .in('course_id', courseIds)
  return count || 0
}

async function getActiveCoursesCount(courseIds: string[]): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .in('id', courseIds)
    .eq('is_published', true)
  return count || 0
}

async function getPendingSubmissionsCount(courseIds: string[]): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .in('assessment.course_id', courseIds)
    .eq('status', 'submitted')
  return count || 0
}

async function getGradedNotReleasedCount(courseIds: string[]): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .in('assessment.course_id', courseIds)
    .eq('status', 'graded')
  return count || 0
}

async function getDraftModulesCount(courseIds: string[]): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)
    .eq('is_published', false)
  return count || 0
}

async function getSubmissionCountForAssessment(assessmentId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
  return count || 0
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return past.toLocaleDateString()
}
