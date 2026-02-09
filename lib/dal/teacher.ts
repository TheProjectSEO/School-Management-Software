import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'

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
 * Uses JWT-based authentication and SECURITY DEFINER RPC function
 */
export async function getTeacherProfile() {
  // Use JWT-based authentication instead of Supabase session
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const supabase = createServiceClient()

  // Use RPC function that bypasses RLS for safe profile fetching
  const { data, error } = await supabase
    .rpc('get_teacher_profile', { user_auth_id: currentUser.sub })

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
  const supabase = createServiceClient()

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

  // Extract sections and deduplicate by section ID
  const sectionsMap = new Map<string, { id: string; name: string; grade_level: string; school_id: string }>()
  for (const item of data) {
    const section = item.section as any
    // Handle both object and array responses from Supabase
    const sectionData = Array.isArray(section) ? section[0] : section
    const sectionId = sectionData?.id
    if (sectionId && !sectionsMap.has(sectionId)) {
      sectionsMap.set(sectionId, {
        id: sectionData.id,
        name: sectionData.name,
        grade_level: sectionData.grade_level,
        school_id: sectionData.school_id
      })
    }
  }

  // Get unique sections
  const uniqueSections = Array.from(sectionsMap.values())

  // Get student counts and subject counts for each section
  const enrichedSections = await Promise.all(
    uniqueSections.map(async (section) => {
      const [studentCount, subjectCount] = await Promise.all([
        getStudentCountForSection(section.id),
        getSubjectCountForTeacherInSection(teacherId, section.id)
      ])

      return {
        id: section.id,
        name: section.name,
        grade_level: section.grade_level,
        school_id: section.school_id,
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
  const supabase = createServiceClient()

  // Fetch assignments with flat columns only — avoids FK join issues
  const { data: assignments, error } = await supabase
    .from('teacher_assignments')
    .select('id, section_id, course_id')
    .eq('teacher_profile_id', teacherId)

  if (error) {
    console.error('Error fetching teacher assignments:', error)
    return []
  }

  if (!assignments || assignments.length === 0) {
    return []
  }

  // Collect unique IDs and fetch courses + sections in parallel
  const courseIds = [...new Set(assignments.map(a => a.course_id).filter(Boolean))] as string[]
  const sectionIds = [...new Set(assignments.map(a => a.section_id).filter(Boolean))] as string[]

  const [coursesResult, sectionsResult] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('courses').select('id, name, subject_code, description, section_id').in('id', courseIds)
      : Promise.resolve({ data: [] as any[] }),
    sectionIds.length > 0
      ? supabase.from('sections').select('id, name, grade_level').in('id', sectionIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const coursesMap = new Map((coursesResult.data ?? []).map((c: any) => [c.id, c]))
  const sectionsMap = new Map((sectionsResult.data ?? []).map((s: any) => [s.id, s]))

  // Enrich with counts
  const enrichedSubjects = await Promise.all(
    assignments.map(async (assignment) => {
      const course = coursesMap.get(assignment.course_id)
      const section = sectionsMap.get(assignment.section_id)

      if (!course) return null

      const [moduleCount, studentCount] = await Promise.all([
        getModuleCountForCourse(assignment.course_id),
        getStudentCountForCourse(assignment.course_id)
      ])

      return {
        id: course.id,
        name: course.name,
        subject_code: course.subject_code,
        description: course.description,
        cover_image_url: null,
        section_id: assignment.section_id,
        section_name: section?.name || '',
        grade_level: section?.grade_level || '',
        module_count: moduleCount,
        student_count: studentCount
      } as TeacherSubject
    })
  )

  return enrichedSubjects.filter(Boolean) as TeacherSubject[]
}

/**
 * Get a single subject/course with full details
 */
export async function getTeacherSubject(courseId: string, teacherId: string): Promise<TeacherSubject | null> {
  const supabase = createServiceClient()

  // First verify teacher has access to this course
  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) return null

  // Fetch assignment with flat columns only — avoids FK join issues
  const { data: assignment, error } = await supabase
    .from('teacher_assignments')
    .select('id, section_id, course_id')
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (error || !assignment) {
    console.error('Error fetching subject assignment:', error)
    return null
  }

  // Fetch course, section, and counts in parallel
  const [courseResult, sectionResult, moduleCount, studentCount] = await Promise.all([
    supabase.from('courses').select('id, name, subject_code, description, section_id').eq('id', courseId).maybeSingle(),
    assignment.section_id
      ? supabase.from('sections').select('id, name, grade_level').eq('id', assignment.section_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getModuleCountForCourse(courseId),
    getStudentCountForCourse(courseId)
  ])

  const course = courseResult.data
  if (!course) {
    console.error('Course not found:', courseId)
    return null
  }

  const section = sectionResult.data

  return {
    id: course.id,
    name: course.name,
    subject_code: course.subject_code,
    description: course.description,
    cover_image_url: null,
    section_id: assignment.section_id,
    section_name: section?.name || '',
    grade_level: section?.grade_level || '',
    module_count: moduleCount,
    student_count: studentCount
  } as TeacherSubject
}

/**
 * Get modules for a specific course
 */
export async function getModulesForCourse(courseId: string, teacherId: string) {
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single()

  if (error || !data) {
    console.error('Error fetching module:', error)
    return null
  }

  // Fetch course info separately to avoid FK join issues
  let course = null
  if (data.course_id) {
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', data.course_id)
      .maybeSingle()
    course = courseData
  }

  // Verify teacher access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, data.course_id)
  if (!hasAccess) return null

  return { ...data, course }
}

export type SectionDetails = {
  id: string
  name: string
  grade_level: string
  school_id: string
  students: {
    id: string
    profile: {
      full_name: string
      avatar_url: string | null
    }
    lrn: string | null
    grade_level: string
  }[]
  courses: {
    id: string
    name: string
    subject_code: string
    module_count: number
  }[]
}

/**
 * Get section details with students and courses
 */
export async function getSectionDetails(sectionId: string, teacherId: string): Promise<SectionDetails | null> {
  const supabase = createServiceClient()

  // Verify teacher has access to this section
  const { count: accessCount } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('section_id', sectionId)

  if (!accessCount || accessCount === 0) {
    console.error('Teacher does not have access to this section')
    return null
  }

  // Get section basic info
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .eq('id', sectionId)
    .single()

  if (sectionError || !section) {
    console.error('Error fetching section:', sectionError)
    return null
  }

  // Get students in this section
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      grade_level,
      profile:school_profiles!inner(
        full_name,
        avatar_url
      )
    `)
    .eq('section_id', sectionId)
    .order('profile(full_name)', { ascending: true })

  if (studentsError) {
    console.error('Error fetching students:', studentsError)
  }

  // Get courses for this section that the teacher teaches
  const { data: assignments, error: coursesError } = await supabase
    .from('teacher_assignments')
    .select(`
      course:courses!inner(
        id,
        name,
        subject_code
      )
    `)
    .eq('teacher_profile_id', teacherId)
    .eq('section_id', sectionId)

  if (coursesError) {
    console.error('Error fetching courses:', coursesError)
  }

  // Get module counts for each course
  const courses = await Promise.all(
    (assignments || []).map(async (item: any) => {
      const moduleCount = await getModuleCountForCourse(item.course.id)
      return {
        id: item.course.id,
        name: item.course.name,
        subject_code: item.course.subject_code,
        module_count: moduleCount
      }
    })
  )

  return {
    id: section.id,
    name: section.name,
    grade_level: section.grade_level,
    school_id: section.school_id,
    students: (students || []).map((s: any) => ({
      id: s.id,
      profile: {
        full_name: s.profile?.full_name || 'Unknown',
        avatar_url: s.profile?.avatar_url || null
      },
      lrn: s.lrn,
      grade_level: s.grade_level
    })),
    courses
  }
}

// Helper functions
async function getStudentCountForSection(sectionId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId)
  return count || 0
}

async function getSubjectCountForSection(sectionId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId)
  return count || 0
}

async function getSubjectCountForTeacherInSection(teacherId: string, sectionId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('section_id', sectionId)
  return count || 0
}

async function getModuleCountForCourse(courseId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
  return count || 0
}

async function getStudentCountForCourse(courseId: string): Promise<number> {
  const supabase = createServiceClient()

  // Count students enrolled in this course (consistent with API route)
  const { count } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  return count || 0
}

async function getLessonCountForModule(moduleId: string): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return count || 0
}

async function checkModuleHasTranscript(moduleId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('teacher_transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return (count || 0) > 0
}

async function checkModuleHasNotes(moduleId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('teacher_notes')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return (count || 0) > 0
}

async function verifyTeacherCourseAccess(teacherId: string, courseId: string): Promise<boolean> {
  const supabase = createServiceClient()
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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
