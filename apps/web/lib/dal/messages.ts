/**
 * Teacher Messaging DAL
 * Handles direct messages between teachers and students
 * Teachers have unlimited messaging capability
 */

import { createClient } from '@/lib/supabase/server'

// Types
export interface DirectMessage {
  id: string
  school_id: string
  from_profile_id: string
  to_profile_id: string
  body: string
  attachments_json?: Record<string, unknown>[]
  sender_type: 'teacher' | 'student'
  is_read: boolean
  read_at?: string
  delivered_at?: string
  created_at: string
  from_user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  to_user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export interface Conversation {
  partner_profile_id: string
  partner_name: string
  partner_avatar_url?: string
  partner_role: 'teacher' | 'student'
  last_message_body: string
  last_message_at: string
  last_message_sender_type: 'teacher' | 'student'
  unread_count: number
  total_messages: number
  student_id?: string
  section_name?: string
  grade_level?: string
}

export interface StudentForMessaging {
  id: string
  profile_id: string
  profile: {
    id: string
    full_name: string
    avatar_url?: string
  }
  section?: {
    id: string
    name: string
    grade_level: string
  }
  grade_level?: string
}

export interface SendMessageResult {
  success: boolean
  message_id?: string
  error?: string
  message?: string
}

// ============================================================================
// GET CONVERSATIONS
// ============================================================================

/**
 * Get all conversations for a teacher
 */
export async function getTeacherConversations(
  teacherId: string
): Promise<Conversation[]> {
  const supabase = await createClient()

  // Get teacher's profile_id
  const { data: teacher, error: teacherError } = await supabase
    .from('teacher_profiles')
    .select('profile_id, school_id')
    .eq('id', teacherId)
    .single()

  if (teacherError || !teacher) {
    console.error('Error fetching teacher:', teacherError)
    return []
  }

  // Get conversations using database function
  const { data: conversations, error } = await supabase.rpc(
    'get_user_conversations',
    {
      p_profile_id: teacher.profile_id,
      p_limit: 100,
    }
  )

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  // Enrich with student info
  const studentConversations: Conversation[] = []

  for (const conv of conversations || []) {
    if (conv.partner_role === 'student') {
      // Get student details
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          grade_level,
          section:sections(id, name, grade_level)
        `)
        .eq('profile_id', conv.partner_profile_id)
        .single()

      studentConversations.push({
        partner_profile_id: conv.partner_profile_id,
        partner_name: conv.partner_name || 'Student',
        partner_avatar_url: conv.partner_avatar_url,
        partner_role: 'student',
        last_message_body: conv.last_message_body,
        last_message_at: conv.last_message_at,
        last_message_sender_type: conv.last_message_sender_type,
        unread_count: Number(conv.unread_count) || 0,
        total_messages: Number(conv.total_messages) || 0,
        student_id: student?.id,
        section_name: (student?.section as any)?.name,
        grade_level: student?.grade_level || (student?.section as any)?.grade_level,
      })
    }
  }

  return studentConversations
}

// ============================================================================
// GET MESSAGES IN CONVERSATION
// ============================================================================

/**
 * Get all messages in a conversation with a student
 */
export async function getConversationMessages(
  teacherId: string,
  studentProfileId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DirectMessage[]> {
  const { limit = 50, offset = 0 } = options
  const supabase = await createClient()

  // Get teacher's profile_id
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  if (!teacher) return []

  // Use database function
  const { data: messages, error } = await supabase.rpc('get_conversation', {
    p_profile_1: teacher.profile_id,
    p_profile_2: studentProfileId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  // Enrich with profile data
  const profileIds = new Set<string>()
  for (const msg of messages || []) {
    profileIds.add(msg.from_profile_id)
    profileIds.add(msg.to_profile_id)
  }

  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, avatar_url')
    .in('id', Array.from(profileIds))

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  const enrichedMessages: DirectMessage[] = (messages || []).map((msg: any) => ({
    ...msg,
    from_user: profileMap.get(msg.from_profile_id),
    to_user: profileMap.get(msg.to_profile_id),
  }))

  // Return chronologically (oldest first)
  return enrichedMessages.reverse()
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

/**
 * Send a message to a student (no quota limit for teachers)
 */
export async function sendMessageToStudent(
  teacherId: string,
  studentId: string,
  schoolId: string,
  body: string,
  attachments?: Record<string, unknown>[]
): Promise<SendMessageResult> {
  const supabase = await createClient()

  // Use database function for teacher messages
  const { data, error } = await supabase.rpc('send_teacher_message', {
    p_teacher_id: teacherId,
    p_student_id: studentId,
    p_school_id: schoolId,
    p_body: body,
    p_attachments: attachments || null,
  })

  if (error) {
    console.error('Error sending message:', error)
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Failed to send message. Please try again.',
    }
  }

  return data as SendMessageResult
}

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Mark messages from a student as read
 */
export async function markMessagesAsRead(
  teacherId: string,
  studentProfileId: string
): Promise<boolean> {
  const supabase = await createClient()

  // Get teacher's profile_id
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  if (!teacher) return false

  // Mark messages as read
  const { error } = await supabase
    .from('teacher_direct_messages')
    .update({ is_read: true })
    .eq('to_profile_id', teacher.profile_id)
    .eq('from_profile_id', studentProfileId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking messages as read:', error)
    return false
  }

  return true
}

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

/**
 * Get total unread message count for a teacher
 */
export async function getUnreadMessageCount(teacherId: string): Promise<number> {
  const supabase = await createClient()

  // Get teacher's profile_id
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  if (!teacher) return 0

  const { data, error } = await supabase.rpc('get_unread_count', {
    p_profile_id: teacher.profile_id,
  })

  if (error) {
    console.error('Error getting unread count:', error)
    return 0
  }

  return data || 0
}

// ============================================================================
// GET STUDENTS FOR MESSAGING
// ============================================================================

/**
 * Get all students the teacher can message (from their courses)
 */
export async function getStudentsForMessaging(
  teacherId: string
): Promise<StudentForMessaging[]> {
  const supabase = await createClient()

  // Get courses taught by this teacher
  const { data: assignments, error: assignError } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId)

  if (assignError || !assignments?.length) {
    console.error('Error fetching assignments:', assignError)
    return []
  }

  const courseIds = assignments.map((a) => a.course_id)

  // Get enrolled students
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      student:students (
        id,
        profile_id,
        grade_level,
        profile:school_profiles (
          id,
          full_name,
          avatar_url
        ),
        section:sections (
          id,
          name,
          grade_level
        )
      )
    `)
    .in('course_id', courseIds)

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }

  // Deduplicate students
  const studentMap = new Map<string, StudentForMessaging>()

  for (const enrollment of enrollments || []) {
    const student = enrollment.student as any
    if (student && !studentMap.has(student.id)) {
      studentMap.set(student.id, {
        id: student.id,
        profile_id: student.profile_id,
        profile: student.profile,
        section: student.section,
        grade_level: student.grade_level,
      })
    }
  }

  return Array.from(studentMap.values())
}

// ============================================================================
// GET STUDENT BY PROFILE ID
// ============================================================================

/**
 * Get student ID from profile ID
 */
export async function getStudentIdByProfileId(
  profileId: string
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (error || !data) return null
  return data.id
}
