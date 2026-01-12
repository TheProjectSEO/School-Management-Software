/**
 * Teacher Announcement Data Access Layer
 * Handles CRUD operations for announcements with targeting support
 */

import { createClient } from '@/lib/supabase/server'
import { getTeacherProfile } from './teacher'

// Types
export type AnnouncementTargetType = 'section' | 'grade' | 'course' | 'school'
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Announcement {
  id: string
  school_id: string
  teacher_id: string
  title: string
  content: string
  target_type: AnnouncementTargetType
  target_section_ids: string[]
  target_grade_levels: string[]
  target_course_ids: string[]
  priority: AnnouncementPriority
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  attachments: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
  created_at: string
  updated_at: string
  // Enriched fields
  target_count?: number
  read_count?: number
  teacher_name?: string
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  target_type: AnnouncementTargetType
  target_section_ids?: string[]
  target_grade_levels?: string[]
  target_course_ids?: string[]
  priority?: AnnouncementPriority
  expires_at?: string | null
  attachments?: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  target_type?: AnnouncementTargetType
  target_section_ids?: string[]
  target_grade_levels?: string[]
  target_course_ids?: string[]
  priority?: AnnouncementPriority
  expires_at?: string | null
  attachments?: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
}

/**
 * Get all announcements for the current teacher
 */
export async function getTeacherAnnouncements(
  options?: {
    publishedOnly?: boolean
    limit?: number
    offset?: number
  }
): Promise<Announcement[]> {
  const teacher = await getTeacherProfile()
  if (!teacher) return []

  const supabase = await createClient()

  let query = supabase
    .from('teacher_announcements')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  if (options?.publishedOnly) {
    query = query.eq('is_published', true)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching announcements:', error)
    return []
  }

  // Enrich with read counts
  const enrichedAnnouncements = await Promise.all(
    (data || []).map(async (announcement) => {
      const { count: readCount } = await supabase
        .from('announcement_reads')
        .select('*', { count: 'exact', head: true })
        .eq('announcement_id', announcement.id)

      // Get target count using the function
      const { data: targetCountResult } = await supabase.rpc(
        'get_announcement_target_count',
        {
          p_school_id: announcement.school_id,
          p_target_type: announcement.target_type,
          p_section_ids: announcement.target_section_ids || [],
          p_grade_levels: announcement.target_grade_levels || [],
          p_course_ids: announcement.target_course_ids || []
        }
      )

      return {
        ...announcement,
        read_count: readCount || 0,
        target_count: targetCountResult || 0
      }
    })
  )

  return enrichedAnnouncements
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncement(announcementId: string): Promise<Announcement | null> {
  const teacher = await getTeacherProfile()
  if (!teacher) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_announcements')
    .select('*')
    .eq('id', announcementId)
    .eq('teacher_id', teacher.id)
    .single()

  if (error) {
    console.error('Error fetching announcement:', error)
    return null
  }

  // Get read count
  const { count: readCount } = await supabase
    .from('announcement_reads')
    .select('*', { count: 'exact', head: true })
    .eq('announcement_id', announcementId)

  // Get target count
  const { data: targetCountResult } = await supabase.rpc(
    'get_announcement_target_count',
    {
      p_school_id: data.school_id,
      p_target_type: data.target_type,
      p_section_ids: data.target_section_ids || [],
      p_grade_levels: data.target_grade_levels || [],
      p_course_ids: data.target_course_ids || []
    }
  )

  return {
    ...data,
    read_count: readCount || 0,
    target_count: targetCountResult || 0
  }
}

/**
 * Create a new announcement (draft by default)
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement | null> {
  const teacher = await getTeacherProfile()
  if (!teacher) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_announcements')
    .insert({
      school_id: teacher.school_id,
      teacher_id: teacher.id,
      title: input.title,
      content: input.content,
      target_type: input.target_type,
      target_section_ids: input.target_section_ids || [],
      target_grade_levels: input.target_grade_levels || [],
      target_course_ids: input.target_course_ids || [],
      priority: input.priority || 'normal',
      expires_at: input.expires_at || null,
      attachments: input.attachments || [],
      is_published: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating announcement:', error)
    return null
  }

  return data
}

/**
 * Update an existing announcement (only drafts can be edited)
 */
export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput
): Promise<Announcement | null> {
  const teacher = await getTeacherProfile()
  if (!teacher) return null

  const supabase = await createClient()

  // First check if it's a draft
  const { data: existing } = await supabase
    .from('teacher_announcements')
    .select('is_published')
    .eq('id', announcementId)
    .eq('teacher_id', teacher.id)
    .single()

  if (existing?.is_published) {
    console.error('Cannot edit a published announcement')
    return null
  }

  const { data, error } = await supabase
    .from('teacher_announcements')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', announcementId)
    .eq('teacher_id', teacher.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating announcement:', error)
    return null
  }

  return data
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  const teacher = await getTeacherProfile()
  if (!teacher) return false

  const supabase = await createClient()

  const { error } = await supabase
    .from('teacher_announcements')
    .delete()
    .eq('id', announcementId)
    .eq('teacher_id', teacher.id)

  if (error) {
    console.error('Error deleting announcement:', error)
    return false
  }

  return true
}

/**
 * Publish an announcement (creates notifications for all targeted students)
 */
export async function publishAnnouncement(announcementId: string): Promise<boolean> {
  const teacher = await getTeacherProfile()
  if (!teacher) return false

  const supabase = await createClient()

  // Call the database function that handles publishing + notification creation
  const { error } = await supabase.rpc('publish_announcement', {
    p_announcement_id: announcementId
  })

  if (error) {
    console.error('Error publishing announcement:', error)
    return false
  }

  return true
}

/**
 * Get available sections for targeting
 */
export async function getTargetableSections(): Promise<Array<{
  id: string
  name: string
  grade_level: string
  student_count: number
}>> {
  const teacher = await getTeacherProfile()
  if (!teacher) return []

  const supabase = await createClient()

  // Get sections the teacher is assigned to (via courses)
  const { data: courses } = await supabase
    .from('courses')
    .select('section_id')
    .eq('teacher_id', teacher.id)

  if (!courses || courses.length === 0) return []

  const sectionIds = Array.from(new Set(courses.map(c => c.section_id)))

  const { data: sections, error } = await supabase
    .from('sections')
    .select(`
      id,
      name,
      grade_level
    `)
    .in('id', sectionIds)

  if (error || !sections) return []

  // Get student counts for each section
  const sectionsWithCounts = await Promise.all(
    sections.map(async (section) => {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', section.id)

      return {
        ...section,
        student_count: count || 0
      }
    })
  )

  return sectionsWithCounts
}

/**
 * Get available grade levels for targeting
 */
export async function getTargetableGradeLevels(): Promise<Array<{
  grade_level: string
  student_count: number
}>> {
  const teacher = await getTeacherProfile()
  if (!teacher) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('students')
    .select('grade_level')
    .eq('school_id', teacher.school_id)
    .not('grade_level', 'is', null)

  if (error || !data) return []

  // Group by grade level and count
  const gradeCounts = data.reduce((acc, student) => {
    const grade = student.grade_level
    if (grade) {
      acc[grade] = (acc[grade] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return Object.entries(gradeCounts)
    .map(([grade_level, student_count]) => ({
      grade_level,
      student_count
    }))
    .sort((a, b) => a.grade_level.localeCompare(b.grade_level, undefined, { numeric: true }))
}

/**
 * Get available courses for targeting
 */
export async function getTargetableCourses(): Promise<Array<{
  id: string
  name: string
  section_name: string
  student_count: number
}>> {
  const teacher = await getTeacherProfile()
  if (!teacher) return []

  const supabase = await createClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      sections!inner(name)
    `)
    .eq('teacher_id', teacher.id)

  if (error || !courses) return []

  // Get enrollment counts
  const coursesWithCounts = await Promise.all(
    courses.map(async (course: any) => {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)

      return {
        id: course.id,
        name: course.name,
        section_name: course.sections?.name || '',
        student_count: count || 0
      }
    })
  )

  return coursesWithCounts
}

/**
 * Get preview of targeted students count
 */
export async function getTargetPreviewCount(
  targetType: AnnouncementTargetType,
  targetSectionIds: string[],
  targetGradeLevels: string[],
  targetCourseIds: string[]
): Promise<number> {
  const teacher = await getTeacherProfile()
  if (!teacher) return 0

  const supabase = await createClient()

  const { data: count } = await supabase.rpc('get_announcement_target_count', {
    p_school_id: teacher.school_id,
    p_target_type: targetType,
    p_section_ids: targetSectionIds,
    p_grade_levels: targetGradeLevels,
    p_course_ids: targetCourseIds
  })

  return count || 0
}
