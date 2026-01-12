/**
 * Teacher Content Management Data Access Layer
 *
 * Handles module and lesson CRUD operations with proper access control.
 * All mutations verify teacher has access to the course before proceeding.
 */

import { createClient } from '@/lib/supabase/server'

// ============================================================================
// Types
// ============================================================================

export type VideoType = 'youtube' | 'vimeo' | 'upload' | 'embed' | 'external'

export type ContentType = 'video' | 'reading' | 'quiz' | 'activity'

export type Lesson = {
  id: string
  module_id: string
  title: string
  content: string | null
  content_type: ContentType
  video_url: string | null
  video_type: VideoType | null
  thumbnail_url: string | null
  duration_minutes: number | null
  order: number
  is_published: boolean
  attachments: LessonAttachment[]
  created_at: string
  updated_at: string
}

export type LessonAttachment = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size_bytes: number | null
  download_count: number
  order_index: number
  created_at: string
}

export type Module = {
  id: string
  course_id: string
  title: string
  description: string | null
  order: number
  duration_minutes: number | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export type CreateModuleInput = {
  course_id: string
  title: string
  description?: string | null
  order?: number
  duration_minutes?: number | null
}

export type UpdateModuleInput = {
  title?: string
  description?: string | null
  order?: number
  duration_minutes?: number | null
  is_published?: boolean
}

export type CreateLessonInput = {
  module_id: string
  title: string
  content?: string | null
  content_type?: ContentType
  video_url?: string | null
  video_type?: VideoType | null
  thumbnail_url?: string | null
  duration_minutes?: number | null
  order?: number
}

export type UpdateLessonInput = {
  title?: string
  content?: string | null
  content_type?: ContentType
  video_url?: string | null
  video_type?: VideoType | null
  thumbnail_url?: string | null
  duration_minutes?: number | null
  order?: number
  is_published?: boolean
}

export type CreateAttachmentInput = {
  lesson_id: string
  title: string
  description?: string | null
  file_url: string
  file_type?: string | null
  file_size_bytes?: number | null
  order_index?: number
}

// ============================================================================
// Access Control Helper
// ============================================================================

/**
 * Verify teacher has access to a course via teacher_assignments
 */
async function verifyTeacherCourseAccess(
  teacherId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)
  return (count || 0) > 0
}

/**
 * Get course_id for a module (to verify access)
 */
async function getCourseIdForModule(moduleId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('modules')
    .select('course_id')
    .eq('id', moduleId)
    .single()
  return data?.course_id || null
}

/**
 * Get course_id for a lesson via its module
 */
async function getCourseIdForLesson(lessonId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lessons')
    .select('module:modules!inner(course_id)')
    .eq('id', lessonId)
    .single()
  return (data?.module as any)?.course_id || null
}

// ============================================================================
// Module Operations
// ============================================================================

/**
 * Create a new module for a course
 */
export async function createModule(
  teacherId: string,
  input: CreateModuleInput
): Promise<Module | null> {
  const supabase = await createClient()

  // Verify access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, input.course_id)
  if (!hasAccess) {
    console.error('Teacher does not have access to this course')
    return null
  }

  // Get the next order number if not provided
  let order = input.order
  if (order === undefined) {
    const { data: existing } = await supabase
      .from('modules')
      .select('order')
      .eq('course_id', input.course_id)
      .order('order', { ascending: false })
      .limit(1)
    order = (existing?.[0]?.order || 0) + 1
  }

  const { data, error } = await supabase
    .from('modules')
    .insert({
      course_id: input.course_id,
      title: input.title,
      description: input.description || null,
      order,
      duration_minutes: input.duration_minutes || null,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating module:', error)
    return null
  }

  return data as Module
}

/**
 * Update an existing module
 */
export async function updateModule(
  teacherId: string,
  moduleId: string,
  input: UpdateModuleInput
): Promise<Module | null> {
  const supabase = await createClient()

  // Get course_id and verify access
  const courseId = await getCourseIdForModule(moduleId)
  if (!courseId) {
    console.error('Module not found')
    return null
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this module')
    return null
  }

  const { data, error } = await supabase
    .from('modules')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', moduleId)
    .select()
    .single()

  if (error) {
    console.error('Error updating module:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      moduleId,
      input
    })
    return null
  }

  if (!data) {
    console.error('Module update returned no data - likely RLS policy issue', { moduleId })
    return null
  }

  return data as Module
}

/**
 * Delete a module and all its lessons
 */
export async function deleteModule(
  teacherId: string,
  moduleId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get course_id and verify access
  const courseId = await getCourseIdForModule(moduleId)
  if (!courseId) {
    console.error('Module not found')
    return false
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this module')
    return false
  }

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId)

  if (error) {
    console.error('Error deleting module:', error)
    return false
  }

  return true
}

/**
 * Publish or unpublish a module
 */
export async function publishModule(
  teacherId: string,
  moduleId: string,
  isPublished: boolean
): Promise<boolean> {
  const result = await updateModule(teacherId, moduleId, { is_published: isPublished })
  return result !== null
}

/**
 * Reorder modules within a course
 */
export async function reorderModules(
  teacherId: string,
  courseId: string,
  moduleIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  // Verify access
  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this course')
    return false
  }

  // Update each module's order
  const updates = moduleIds.map((id, index) => ({
    id,
    order: index + 1,
    updated_at: new Date().toISOString()
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('modules')
      .update({ order: update.order, updated_at: update.updated_at })
      .eq('id', update.id)
      .eq('course_id', courseId)

    if (error) {
      console.error('Error reordering module:', error)
      return false
    }
  }

  return true
}

// ============================================================================
// Lesson Operations
// ============================================================================

/**
 * Get all lessons for a module
 */
export async function getLessonsForModule(
  teacherId: string,
  moduleId: string
): Promise<Lesson[]> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForModule(moduleId)
  if (!courseId) return []

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) return []

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      attachments:lesson_attachments(*)
    `)
    .eq('module_id', moduleId)
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching lessons:', error)
    return []
  }

  return data as Lesson[]
}

/**
 * Get a single lesson with attachments
 */
export async function getLesson(
  teacherId: string,
  lessonId: string
): Promise<Lesson | null> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForLesson(lessonId)
  if (!courseId) return null

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) return null

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      attachments:lesson_attachments(*)
    `)
    .eq('id', lessonId)
    .single()

  if (error) {
    console.error('Error fetching lesson:', error)
    return null
  }

  return data as Lesson
}

/**
 * Create a new lesson
 */
export async function createLesson(
  teacherId: string,
  input: CreateLessonInput
): Promise<Lesson | null> {
  const supabase = await createClient()

  // Verify access via module
  const courseId = await getCourseIdForModule(input.module_id)
  if (!courseId) {
    console.error('Module not found')
    return null
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this module')
    return null
  }

  // Get the next order number if not provided
  let order = input.order
  if (order === undefined) {
    const { data: existing } = await supabase
      .from('lessons')
      .select('order')
      .eq('module_id', input.module_id)
      .order('order', { ascending: false })
      .limit(1)
    order = (existing?.[0]?.order || 0) + 1
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: input.module_id,
      title: input.title,
      content: input.content || null,
      content_type: input.content_type || 'video',
      video_url: input.video_url || null,
      video_type: input.video_type || null,
      thumbnail_url: input.thumbnail_url || null,
      duration_minutes: input.duration_minutes || null,
      order,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lesson:', error)
    return null
  }

  return { ...data, attachments: [] } as Lesson
}

/**
 * Update an existing lesson
 */
export async function updateLesson(
  teacherId: string,
  lessonId: string,
  input: UpdateLessonInput
): Promise<Lesson | null> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForLesson(lessonId)
  if (!courseId) {
    console.error('Lesson not found')
    return null
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this lesson')
    return null
  }

  const { data, error } = await supabase
    .from('lessons')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', lessonId)
    .select()
    .single()

  if (error) {
    console.error('Error updating lesson:', error)
    return null
  }

  // Fetch attachments separately
  const { data: attachments } = await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })

  return { ...data, attachments: attachments || [] } as Lesson
}

/**
 * Delete a lesson
 */
export async function deleteLesson(
  teacherId: string,
  lessonId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForLesson(lessonId)
  if (!courseId) {
    console.error('Lesson not found')
    return false
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this lesson')
    return false
  }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    console.error('Error deleting lesson:', error)
    return false
  }

  return true
}

/**
 * Publish or unpublish a lesson
 */
export async function publishLesson(
  teacherId: string,
  lessonId: string,
  isPublished: boolean
): Promise<boolean> {
  const result = await updateLesson(teacherId, lessonId, { is_published: isPublished })
  return result !== null
}

/**
 * Reorder lessons within a module
 */
export async function reorderLessons(
  teacherId: string,
  moduleId: string,
  lessonIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForModule(moduleId)
  if (!courseId) return false

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this module')
    return false
  }

  // Update each lesson's order
  for (let i = 0; i < lessonIds.length; i++) {
    const { error } = await supabase
      .from('lessons')
      .update({ order: i + 1, updated_at: new Date().toISOString() })
      .eq('id', lessonIds[i])
      .eq('module_id', moduleId)

    if (error) {
      console.error('Error reordering lesson:', error)
      return false
    }
  }

  return true
}

// ============================================================================
// Lesson Attachment Operations
// ============================================================================

/**
 * Add an attachment to a lesson
 */
export async function addLessonAttachment(
  teacherId: string,
  input: CreateAttachmentInput
): Promise<LessonAttachment | null> {
  const supabase = await createClient()

  // Verify access
  const courseId = await getCourseIdForLesson(input.lesson_id)
  if (!courseId) {
    console.error('Lesson not found')
    return null
  }

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this lesson')
    return null
  }

  // Get the next order_index if not provided
  let orderIndex = input.order_index
  if (orderIndex === undefined) {
    const { data: existing } = await supabase
      .from('lesson_attachments')
      .select('order_index')
      .eq('lesson_id', input.lesson_id)
      .order('order_index', { ascending: false })
      .limit(1)
    orderIndex = (existing?.[0]?.order_index || 0) + 1
  }

  // Get teacher's profile for created_by
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user?.id)
    .single()

  const { data, error } = await supabase
    .from('lesson_attachments')
    .insert({
      lesson_id: input.lesson_id,
      title: input.title,
      description: input.description || null,
      file_url: input.file_url,
      file_type: input.file_type || null,
      file_size_bytes: input.file_size_bytes || null,
      order_index: orderIndex,
      download_count: 0,
      created_by: profile?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding attachment:', error)
    return null
  }

  return data as LessonAttachment
}

/**
 * Delete an attachment
 */
export async function deleteLessonAttachment(
  teacherId: string,
  attachmentId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get the lesson_id first
  const { data: attachment } = await supabase
    .from('lesson_attachments')
    .select('lesson_id, file_url')
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    console.error('Attachment not found')
    return false
  }

  // Verify access
  const courseId = await getCourseIdForLesson(attachment.lesson_id)
  if (!courseId) return false

  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this attachment')
    return false
  }

  // Delete from database
  const { error } = await supabase
    .from('lesson_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    console.error('Error deleting attachment:', error)
    return false
  }

  // Optionally delete from storage if it's a storage URL
  // (The file_url might be an external URL or a storage path)
  if (attachment.file_url.includes('supabase')) {
    try {
      const urlParts = attachment.file_url.split('/storage/v1/object/public/')
      if (urlParts.length > 1) {
        const [bucket, ...pathParts] = urlParts[1].split('/')
        const path = pathParts.join('/')
        await supabase.storage.from(bucket).remove([path])
      }
    } catch (e) {
      console.warn('Could not delete file from storage:', e)
    }
  }

  return true
}

// ============================================================================
// Video Helper Functions
// ============================================================================

/**
 * Detect video type from URL
 */
export function detectVideoType(url: string): VideoType {
  if (!url) return 'external'

  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube'
  }
  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo'
  }
  if (lowerUrl.includes('supabase') && lowerUrl.includes('storage')) {
    return 'upload'
  }
  if (lowerUrl.includes('embed') || lowerUrl.includes('iframe')) {
    return 'embed'
  }

  return 'external'
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Get YouTube embed URL from video URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

/**
 * Get YouTube thumbnail URL from video URL
 */
export function getYouTubeThumbnail(
  url: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

/**
 * Extract Vimeo video ID from URL
 */
export function extractVimeoVideoId(url: string): string | null {
  if (!url) return null

  const patterns = [
    /(?:vimeo\.com\/)(\d+)/,
    /(?:player\.vimeo\.com\/video\/)(\d+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Get Vimeo embed URL from video URL
 */
export function getVimeoEmbedUrl(url: string): string | null {
  const videoId = extractVimeoVideoId(url)
  if (!videoId) return null
  return `https://player.vimeo.com/video/${videoId}`
}
