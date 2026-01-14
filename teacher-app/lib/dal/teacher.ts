import { createClient } from '@/lib/supabase/server'

export type TeacherProfile = {
  id: string
  profile_id: string
  school_id: string
  employee_id: string | null
  department: string | null
  specialization: string | null
  is_active: boolean
  profile: {
    full_name: string
    avatar_url: string | null
  }
  school: {
    name: string
    logo_url: string | null
  }
}

export type SectionWithDetails = {
  id: string
  name: string
  grade_level: string
  school_id: string
  subject_count: number
  student_count: number
}

export type TeacherSubject = {
  id: string
  name: string
  subject_code: string
  description: string | null
  cover_image_url: string | null
  section_id: string
  section_name: string
  grade_level: string
  module_count: number
  student_count: number
  is_published: boolean
}

export type ModuleWithDetails = {
  id: string
  title: string
  description: string | null
  order: number
  duration_minutes: number | null
  is_published: boolean
  lesson_count: number
  has_transcript: boolean
  has_notes: boolean
  created_at: string
  updated_at: string
}

/**
 * Get the teacher profile for the current authenticated user
 * Uses SECURITY DEFINER RPC function to bypass RLS issues
 */
export async function getTeacherProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use RPC function that bypasses RLS for safe profile fetching
  const { data, error } = await supabase
    .rpc('get_teacher_profile', { user_auth_id: user.id })

  if (error) {
    console.error('Error fetching teacher profile:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  // Transform RPC result to expected format
  const row = data[0]
  return {
    id: row.id,
    profile_id: row.profile_id,
    school_id: row.school_id,
    employee_id: row.employee_id,
    department: row.department,
    specialization: row.specialization,
    is_active: row.is_active,
    profile: {
      full_name: row.profile_full_name,
      avatar_url: row.profile_avatar_url
    },
    school: {
      name: row.school_name,
      logo_url: row.school_logo_url
    }
  } as TeacherProfile
}

/**
 * Get all sections (classes) assigned to this teacher
 */
export async function getTeacherSections(teacherId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_assignments')
    .select(`
      section:sections!inner(
        id,
        name,
        grade_level,
        school_id
      )
    `)
    .eq('teacher_profile_id', teacherId)

  if (error) {
    console.error('Error fetching teacher sections:', error)
    return []
  }

  // Get student counts and subject counts for each section
  const sections = data.map((item: any) => item.section)
  const enrichedSections = await Promise.all(
    sections.map(async (section: any) => {
      const [studentCount, subjectCount] = await Promise.all([
        getStudentCountForSection(section?.id || section?.[0]?.id),
        getSubjectCountForSection(section?.id || section?.[0]?.id)
      ])

      return {
        ...section,
        student_count: studentCount,
        subject_count: subjectCount
      } as SectionWithDetails
    })
  )

  return enrichedSections
}

/**
 * Get all subjects/courses taught by this teacher
 */
export async function getTeacherSubjects(teacherId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_assignments')
    .select(`
      course:courses!inner(
        id,
        name,
        subject_code,
        description,
        cover_image_url,
        section_id,
        is_published:is_published
      ),
      section:sections!inner(
        id,
        name,
        grade_level
      )
    `)
    .eq('teacher_profile_id', teacherId)

  if (error) {
    console.error('Error fetching teacher subjects:', error)
    return []
  }

  // Enrich with counts
  const enrichedSubjects = await Promise.all(
    data.map(async (item: any) => {
      const [moduleCount, studentCount] = await Promise.all([
        getModuleCountForCourse(item.course.id),
        getStudentCountForCourse(item.course.id)
      ])

      return {
        id: item.course.id,
        name: item.course.name,
        subject_code: item.course.subject_code,
        description: item.course.description,
        cover_image_url: item.course.cover_image_url,
        section_id: item.course.section_id,
        section_name: item.section.name,
        grade_level: item.section.grade_level,
        module_count: moduleCount,
        student_count: studentCount,
        is_published: item.course.is_published
      } as TeacherSubject
    })
  )

  return enrichedSubjects
}

/**
 * Get modules for a specific course
 */
export async function getModulesForCourse(courseId: string, teacherId: string) {
  const supabase = await createClient()

  // First verify teacher has access to this course
  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) return []

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching modules:', error)
    return []
  }

  // Enrich with additional details
  const enrichedModules = await Promise.all(
    data.map(async (module) => {
      const [lessonCount, hasTranscript, hasNotes] = await Promise.all([
        getLessonCountForModule(module.id),
        checkModuleHasTranscript(module.id),
        checkModuleHasNotes(module.id)
      ])

      return {
        ...module,
        lesson_count: lessonCount,
        has_transcript: hasTranscript,
        has_notes: hasNotes
      } as ModuleWithDetails
    })
  )

  return enrichedModules
}

/**
 * Get a single module with full details
 */
export async function getModule(moduleId: string, teacherId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('modules')
    .select(`
      *,
      course:courses!inner(
        id,
        name,
        teacher_id
      )
    `)
    .eq('id', moduleId)
    .single()

  if (error || !data) {
    console.error('Error fetching module:', error)
    return null
  }

  // Verify teacher access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, data.course.id)
  if (!hasAccess) return null

  return data
}

// Helper functions
async function getStudentCountForSection(sectionId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId)
  return count || 0
}

async function getSubjectCountForSection(sectionId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId)
  return count || 0
}

async function getModuleCountForCourse(courseId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
  return count || 0
}

async function getStudentCountForCourse(courseId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
  return count || 0
}

async function getLessonCountForModule(moduleId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return count || 0
}

async function checkModuleHasTranscript(moduleId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return (count || 0) > 0
}

async function checkModuleHasNotes(moduleId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_notes')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return (count || 0) > 0
}

async function verifyTeacherCourseAccess(teacherId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)
  return (count || 0) > 0
}

// Types for live sessions and calendar
export type LiveSession = {
  id: string
  course_id: string
  section_id: string
  module_id: string | null
  title: string
  description: string | null
  scheduled_start: string
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  provider: 'zoom' | 'meet' | 'teams' | 'livekit' | 'daily' | 'internal' | null
  room_id: string | null
  join_url: string | null
  recording_url: string | null
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  created_at: string
  course: {
    name: string
    subject_code: string
  }
  section: {
    name: string
    grade_level: string
  }
  module?: {
    title: string
  }
}

export type AssessmentDueDate = {
  id: string
  title: string
  description: string | null
  type: 'quiz' | 'exam' | 'assignment' | 'project'
  due_date: string
  total_points: number
  course_id: string
  course: {
    name: string
    subject_code: string
  }
}

/**
 * Get live sessions for a teacher within a date range
 */
export async function getTeacherLiveSessions(
  teacherId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  // Get all courses assigned to this teacher
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return []
  }

  const courseIds = assignments.map(a => a.course_id)

  // Get sessions for these courses
  const { data, error } = await supabase
    .from('teacher_live_sessions')
    .select(`
      *,
      course:courses!inner(
        name,
        subject_code
      ),
      section:sections!inner(
        name,
        grade_level
      ),
      module:modules(
        title
      )
    `)
    .in('course_id', courseIds)
    .gte('scheduled_start', startDate)
    .lte('scheduled_start', endDate)
    .order('scheduled_start', { ascending: true })

  if (error) {
    console.error('Error fetching live sessions:', error)
    return []
  }

  return data as unknown as LiveSession[]
}

/**
 * Get upcoming assessment due dates for teacher's courses
 */
export async function getUpcomingAssessmentDueDates(
  teacherId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient()

  // Get all courses assigned to this teacher
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return []
  }

  const courseIds = assignments.map(a => a.course_id)

  // Get assessments with due dates in range
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      id,
      title,
      description,
      type,
      due_date,
      total_points,
      course_id,
      course:courses!inner(
        name,
        subject_code
      )
    `)
    .in('course_id', courseIds)
    .not('due_date', 'is', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching assessment due dates:', error)
    return []
  }

  return data as unknown as AssessmentDueDate[]
}

/**
 * Create a new live session
 */
export async function createLiveSession(
  teacherId: string,
  sessionData: {
    course_id: string
    section_id: string
    module_id?: string | null
    title: string
    description?: string | null
    scheduled_start: string
    scheduled_end?: string | null
    provider?: 'zoom' | 'meet' | 'teams' | 'livekit' | 'daily' | 'internal'
    join_url?: string | null
  }
) {
  const supabase = await createClient()

  // Verify teacher has access to this course
  const hasAccess = await verifyTeacherCourseAccess(teacherId, sessionData.course_id)
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this course')
  }

  // Get teacher's profile ID for created_by
  const teacherProfile = await getTeacherProfile()
  if (!teacherProfile) {
    throw new Error('Teacher profile not found')
  }

  const { data, error } = await supabase
    .from('teacher_live_sessions')
    .insert({
      ...sessionData,
      created_by: teacherProfile.profile_id,
      status: 'scheduled'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating live session:', error)
    throw error
  }

  return data
}

/**
 * Update a live session
 */
export async function updateLiveSession(
  sessionId: string,
  teacherId: string,
  updates: Partial<LiveSession>
) {
  const supabase = await createClient()

  // First get the session to verify access
  const { data: session } = await supabase
    .from('teacher_live_sessions')
    .select('course_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Session not found')
  }

  // Verify teacher has access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, session.course_id)
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this session')
  }

  const { data, error } = await supabase
    .from('teacher_live_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating live session:', error)
    throw error
  }

  return data
}

/**
 * Delete a live session
 */
export async function deleteLiveSession(sessionId: string, teacherId: string) {
  const supabase = await createClient()

  // First get the session to verify access
  const { data: session } = await supabase
    .from('teacher_live_sessions')
    .select('course_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Session not found')
  }

  // Verify teacher has access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, session.course_id)
  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this session')
  }

  const { error } = await supabase
    .from('teacher_live_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting live session:', error)
    throw error
  }
}
