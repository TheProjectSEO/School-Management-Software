/**
 * Teacher Messaging DAL
 * Handles direct messages between teachers and students
 * Teachers have unlimited messaging capability
 */

import { createServiceClient } from '@/lib/supabase/service'

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
  partner_role: 'teacher' | 'student' | 'admin'
  last_message_body: string
  last_message_at: string
  last_message_sender_type: 'teacher' | 'student' | 'admin'
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
  const supabase = createServiceClient()

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
  let conversations: any[] | null = null
  const { data: rpcData, error } = await supabase.rpc(
    'get_user_conversations',
    {
      p_profile_id: teacher.profile_id,
      p_limit: 100,
    }
  )

  if (error) {
    console.error('Error fetching conversations via RPC:', error)
    // If RPC doesn't exist, fall back to direct query
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      console.log('RPC get_user_conversations not found, using direct query fallback')
      const { data: directMsgs } = await supabase
        .from('teacher_direct_messages')
        .select('from_profile_id, to_profile_id, body, created_at, sender_type, is_read')
        .or(`from_profile_id.eq.${teacher.profile_id},to_profile_id.eq.${teacher.profile_id}`)
        .order('created_at', { ascending: false })

      // Build conversations from raw messages
      if (directMsgs && directMsgs.length > 0) {
        const partnerMap = new Map<string, any>()
        for (const msg of directMsgs) {
          const partnerId = msg.from_profile_id === teacher.profile_id
            ? msg.to_profile_id
            : msg.from_profile_id
          if (!partnerMap.has(partnerId)) {
            // Determine partner role
            const isFromTeacher = msg.from_profile_id === teacher.profile_id
            const partnerRole = isFromTeacher ? msg.sender_type === 'teacher' ? 'student' : msg.sender_type : msg.sender_type
            partnerMap.set(partnerId, {
              partner_profile_id: partnerId,
              partner_name: null,
              partner_avatar_url: null,
              partner_role: partnerRole === 'teacher' ? 'student' : partnerRole,
              last_message_body: msg.body,
              last_message_at: msg.created_at,
              last_message_sender_type: msg.sender_type,
              unread_count: 0,
              total_messages: 0,
            })
          }
          const conv = partnerMap.get(partnerId)!
          conv.total_messages++
          if (!msg.is_read && msg.to_profile_id === teacher.profile_id) {
            conv.unread_count++
          }
        }

        // Fetch partner names
        const partnerIds = [...partnerMap.keys()]
        const { data: partnerProfiles } = await supabase
          .from('school_profiles')
          .select('id, full_name, avatar_url')
          .in('id', partnerIds)

        for (const profile of partnerProfiles || []) {
          const conv = partnerMap.get(profile.id)
          if (conv) {
            conv.partner_name = profile.full_name
            conv.partner_avatar_url = profile.avatar_url
          }
        }

        conversations = [...partnerMap.values()]
      }
    }
    // Don't return early — fallback below will find admin conversations directly
  } else {
    conversations = rpcData
  }

  // Enrich with student/admin info
  const allConversations: Conversation[] = []
  const seenPartnerIds = new Set<string>()

  for (const conv of conversations || []) {
    if (conv.partner_role === 'student') {
      // Get student details (flat select — no FK joins per CLAUDE.md)
      const { data: student } = await supabase
        .from('students')
        .select('id, grade_level, section_id')
        .eq('profile_id', conv.partner_profile_id)
        .single()

      // Get section info separately
      let sectionName: string | undefined
      let sectionGrade: string | undefined
      if (student?.section_id) {
        const { data: section } = await supabase
          .from('sections')
          .select('name, grade_level')
          .eq('id', student.section_id)
          .single()
        sectionName = section?.name
        sectionGrade = section?.grade_level
      }

      seenPartnerIds.add(conv.partner_profile_id)
      allConversations.push({
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
        section_name: sectionName,
        grade_level: student?.grade_level || sectionGrade,
      })
    } else if (conv.partner_role === 'admin') {
      seenPartnerIds.add(conv.partner_profile_id)
      allConversations.push({
        partner_profile_id: conv.partner_profile_id,
        partner_name: conv.partner_name || 'Admin',
        partner_avatar_url: conv.partner_avatar_url,
        partner_role: 'admin',
        last_message_body: conv.last_message_body,
        last_message_at: conv.last_message_at,
        last_message_sender_type: conv.last_message_sender_type,
        unread_count: Number(conv.unread_count) || 0,
        total_messages: Number(conv.total_messages) || 0,
      })
    } else {
      // Unknown role — check if this partner is an admin (handles case where
      // the get_user_conversations RPC hasn't been updated to detect admins)
      const { data: adminRecord } = await supabase
        .from('admins')
        .select('id')
        .eq('profile_id', conv.partner_profile_id)
        .maybeSingle()

      if (adminRecord) {
        seenPartnerIds.add(conv.partner_profile_id)
        allConversations.push({
          partner_profile_id: conv.partner_profile_id,
          partner_name: conv.partner_name || 'Admin',
          partner_avatar_url: conv.partner_avatar_url,
          partner_role: 'admin',
          last_message_body: conv.last_message_body,
          last_message_at: conv.last_message_at,
          last_message_sender_type: conv.last_message_sender_type,
          unread_count: Number(conv.unread_count) || 0,
          total_messages: Number(conv.total_messages) || 0,
        })
      }
    }
  }

  // Direct fallback: find admin conversations from teacher_direct_messages
  // in case the RPC missed them entirely (e.g. migration not applied)
  const { data: adminDirectMsgs } = await supabase
    .from('teacher_direct_messages')
    .select('from_profile_id, to_profile_id, body, created_at, sender_type, is_read')
    .or(`from_profile_id.eq.${teacher.profile_id},to_profile_id.eq.${teacher.profile_id}`)
    .eq('sender_type', 'admin')
    .order('created_at', { ascending: false })

  if (adminDirectMsgs && adminDirectMsgs.length > 0) {
    // Collect unique admin partner IDs not already in conversations
    const missingAdminPids = new Map<string, typeof adminDirectMsgs[0]>()
    for (const msg of adminDirectMsgs) {
      const adminPid = msg.from_profile_id === teacher.profile_id
        ? msg.to_profile_id
        : msg.from_profile_id
      if (!seenPartnerIds.has(adminPid) && !missingAdminPids.has(adminPid)) {
        missingAdminPids.set(adminPid, msg) // store latest message
      }
    }

    if (missingAdminPids.size > 0) {
      const { data: adminProfiles } = await supabase
        .from('school_profiles')
        .select('id, full_name, avatar_url')
        .in('id', [...missingAdminPids.keys()])

      const profileMap = new Map((adminProfiles || []).map(p => [p.id, p]))

      for (const [adminPid, latestMsg] of missingAdminPids) {
        const profile = profileMap.get(adminPid)
        const unreadCount = adminDirectMsgs.filter(
          m => m.from_profile_id === adminPid && m.to_profile_id === teacher.profile_id && !m.is_read
        ).length

        allConversations.push({
          partner_profile_id: adminPid,
          partner_name: profile?.full_name || 'Admin',
          partner_avatar_url: profile?.avatar_url,
          partner_role: 'admin',
          last_message_body: latestMsg.body || '',
          last_message_at: latestMsg.created_at,
          last_message_sender_type: 'admin',
          unread_count: unreadCount,
          total_messages: adminDirectMsgs.filter(
            m => m.from_profile_id === adminPid || m.to_profile_id === adminPid
          ).length,
        })
      }
    }
  }

  return allConversations
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
  const supabase = createServiceClient()

  // Get teacher's profile_id
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  if (!teacher) return []

  // Use database function, with direct query fallback
  let messages: any[] | null = null
  const { data: rpcMessages, error } = await supabase.rpc('get_conversation', {
    p_profile_1: teacher.profile_id,
    p_profile_2: studentProfileId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    console.error('Error fetching messages via RPC:', error)
    // Fallback to direct query if RPC doesn't exist
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      console.log('RPC get_conversation not found, using direct query fallback')
      const { data: directMsgs } = await supabase
        .from('teacher_direct_messages')
        .select('*')
        .or(
          `and(from_profile_id.eq.${teacher.profile_id},to_profile_id.eq.${studentProfileId}),and(from_profile_id.eq.${studentProfileId},to_profile_id.eq.${teacher.profile_id})`
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      messages = directMsgs
    } else {
      return []
    }
  } else {
    messages = rpcMessages
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
  const supabase = createServiceClient()

  // Get teacher's profile_id
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', teacherId)
    .single()

  if (!teacherProfile) {
    return { success: false, error: 'TEACHER_NOT_FOUND', message: 'Teacher profile not found' }
  }

  // Get student's profile_id
  const { data: studentProfile } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', studentId)
    .single()

  if (!studentProfile) {
    return { success: false, error: 'STUDENT_NOT_FOUND', message: 'Student not found' }
  }

  // Try RPC first, fall back to direct insert
  const { data, error } = await supabase.rpc('send_teacher_message', {
    p_teacher_id: teacherId,
    p_student_id: studentId,
    p_school_id: schoolId,
    p_body: body,
    p_attachments: attachments || null,
  })

  if (error) {
    console.error('Error sending message via RPC:', error)
    // Fallback to direct insert if RPC doesn't exist
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      console.log('RPC send_teacher_message not found, using direct insert fallback')
      const { data: inserted, error: insertError } = await supabase
        .from('teacher_direct_messages')
        .insert({
          school_id: schoolId,
          from_profile_id: teacherProfile.profile_id,
          to_profile_id: studentProfile.profile_id,
          body,
          sender_type: 'teacher',
          attachments_json: attachments || null,
          is_read: false,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error inserting message directly:', insertError)
        return { success: false, error: 'DATABASE_ERROR', message: 'Failed to send message. Please try again.' }
      }

      return { success: true, message_id: inserted.id }
    }

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
    console.error('Error getting unread count via RPC:', error)
    // Fallback to direct count if RPC doesn't exist
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      const { count } = await supabase
        .from('teacher_direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_profile_id', teacher.profile_id)
        .eq('is_read', false)
      return count || 0
    }
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
  const supabase = createServiceClient()

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

  // Get enrolled student IDs (flat select — no FK joins per CLAUDE.md)
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('student_id')
    .in('course_id', courseIds)

  if (error) {
    console.error('Error fetching enrollments:', error)
    return []
  }

  const studentIds = [...new Set((enrollments || []).map((e) => e.student_id).filter(Boolean))]
  if (studentIds.length === 0) return []

  // Get student records
  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id, grade_level, section_id')
    .in('id', studentIds)

  if (!students || students.length === 0) return []

  // Get profiles separately
  const profileIds = [...new Set(students.map((s) => s.profile_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, avatar_url')
    .in('id', profileIds)

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

  // Get sections separately
  const sectionIds = [...new Set(students.map((s) => s.section_id).filter(Boolean))]
  let sectionMap = new Map<string, { id: string; name: string; grade_level: string }>()
  if (sectionIds.length > 0) {
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, grade_level')
      .in('id', sectionIds)

    sectionMap = new Map((sections || []).map((s) => [s.id, s]))
  }

  // Build deduplicated student list
  const studentMap = new Map<string, StudentForMessaging>()
  for (const student of students) {
    if (!studentMap.has(student.id)) {
      const profile = profileMap.get(student.profile_id)
      const section = student.section_id ? sectionMap.get(student.section_id) : undefined
      studentMap.set(student.id, {
        id: student.id,
        profile_id: student.profile_id,
        profile: profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url } : { id: student.profile_id, full_name: 'Unknown Student' },
        section: section ? { id: section.id, name: section.name, grade_level: section.grade_level } : undefined,
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
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (error || !data) return null
  return data.id
}
