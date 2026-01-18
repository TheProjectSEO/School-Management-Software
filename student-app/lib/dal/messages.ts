/**
 * Student Messaging DAL
 * Handles direct messages between students and teachers
 * Enforces 3-message daily limit for students
 */

import { createClient } from "@/lib/supabase/server";
import type {
  DirectMessage,
  Conversation,
  MessageQuota,
  SendMessageResult,
  Teacher,
} from "./types";

// ============================================================================
// GET CONVERSATIONS
// ============================================================================

/**
 * Get all conversations for a student
 * Returns teachers the student has messaged or received messages from
 */
export async function getStudentConversations(
  studentId: string
): Promise<Conversation[]> {
  const supabase = await createClient();

  // First get the student's profile_id using RPC to bypass RLS
  const { data: studentData, error: studentError } = await supabase.rpc(
    "get_student_profile_by_id",
    { p_student_id: studentId }
  );

  if (studentError || !studentData || studentData.length === 0) {
    console.error("Error fetching student via RPC:", studentError);
    return [];
  }

  const student = studentData[0];

  // Get conversations using the database function
  const { data: conversations, error } = await supabase.rpc(
    "get_user_conversations",
    {
      p_profile_id: student.profile_id,
      p_limit: 50,
    }
  );

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  // Filter to only show teacher conversations and enrich with teacher info
  const teacherConversations: Conversation[] = [];

  for (const conv of conversations || []) {
    if (conv.partner_role === "teacher") {
      // Get teacher_id for quota checks
      const { data: teacher } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("profile_id", conv.partner_profile_id)
        .single();

      teacherConversations.push({
        partner_profile_id: conv.partner_profile_id,
        partner_name: conv.partner_name || "Teacher",
        partner_avatar_url: conv.partner_avatar_url,
        partner_role: "teacher",
        last_message_body: conv.last_message_body,
        last_message_at: conv.last_message_at,
        last_message_sender_type: conv.last_message_sender_type,
        unread_count: Number(conv.unread_count) || 0,
        total_messages: Number(conv.total_messages) || 0,
        teacher_id: teacher?.id,
      });
    }
  }

  return teacherConversations;
}

// ============================================================================
// GET MESSAGES IN CONVERSATION
// ============================================================================

/**
 * Get all messages in a conversation with a specific teacher
 */
export async function getConversationMessages(
  studentId: string,
  teacherProfileId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DirectMessage[]> {
  const { limit = 50, offset = 0 } = options;
  const supabase = await createClient();

  // Get student's profile_id using RPC to bypass RLS
  const { data: studentData } = await supabase.rpc("get_student_profile_by_id", {
    p_student_id: studentId,
  });

  if (!studentData || studentData.length === 0) return [];
  const student = studentData[0];

  // Use database function to get conversation
  const { data: messages, error } = await supabase.rpc("get_conversation", {
    p_profile_1: student.profile_id,
    p_profile_2: teacherProfileId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  // Enrich with profile data
  const enrichedMessages: DirectMessage[] = [];
  const profileIds = new Set<string>();

  for (const msg of messages || []) {
    profileIds.add(msg.from_profile_id);
    profileIds.add(msg.to_profile_id);
  }

  // Fetch all profiles at once
  const { data: profiles } = await supabase
    .from("school_profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(profileIds));

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  for (const msg of messages || []) {
    enrichedMessages.push({
      ...msg,
      from_user: profileMap.get(msg.from_profile_id),
      to_user: profileMap.get(msg.to_profile_id),
    });
  }

  // Sort chronologically (oldest first for chat display)
  return enrichedMessages.reverse();
}

// ============================================================================
// MESSAGE QUOTA
// ============================================================================

/**
 * Check student's message quota for a specific teacher
 */
export async function getMessageQuota(
  studentId: string,
  teacherId: string
): Promise<MessageQuota> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_student_message_quota", {
    p_student_id: studentId,
    p_teacher_id: teacherId,
  });

  if (error) {
    console.error("Error checking quota:", error);
    // Return default quota on error
    return {
      can_send: false,
      remaining: 0,
      used: 0,
      max: 3,
      resets_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return data as MessageQuota;
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

/**
 * Send a message to a teacher (with quota enforcement)
 */
export async function sendMessageToTeacher(
  studentId: string,
  teacherId: string,
  schoolId: string,
  body: string,
  attachments?: Record<string, unknown>[]
): Promise<SendMessageResult> {
  const supabase = await createClient();

  // Use the database function that handles quota enforcement atomically
  const { data, error } = await supabase.rpc("send_student_message", {
    p_student_id: studentId,
    p_teacher_id: teacherId,
    p_school_id: schoolId,
    p_body: body,
    p_attachments: attachments || null,
  });

  if (error) {
    console.error("Error sending message:", error);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Failed to send message. Please try again.",
    };
  }

  return data as SendMessageResult;
}

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Mark messages from a teacher as read
 */
export async function markMessagesAsRead(
  studentId: string,
  teacherProfileId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get student's profile_id using RPC to bypass RLS
  const { data: studentData } = await supabase.rpc("get_student_profile_by_id", {
    p_student_id: studentId,
  });

  if (!studentData || studentData.length === 0) return false;
  const student = studentData[0];

  // Mark all messages TO this student FROM the teacher as read
  const { error } = await supabase
    .from("teacher_direct_messages")
    .update({ is_read: true })
    .eq("to_profile_id", student.profile_id)
    .eq("from_profile_id", teacherProfileId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking messages as read:", error);
    return false;
  }

  return true;
}

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

/**
 * Get total unread message count for a student
 */
export async function getUnreadMessageCount(studentId: string): Promise<number> {
  const supabase = await createClient();

  // Get student's profile_id using RPC to bypass RLS
  const { data: studentData } = await supabase.rpc("get_student_profile_by_id", {
    p_student_id: studentId,
  });

  if (!studentData || studentData.length === 0) return 0;
  const student = studentData[0];

  const { data, error } = await supabase.rpc("get_unread_count", {
    p_profile_id: student.profile_id,
  });

  if (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }

  return data || 0;
}

// ============================================================================
// GET AVAILABLE TEACHERS
// ============================================================================

/**
 * Get teachers the student can message (from their enrolled courses)
 */
export async function getAvailableTeachers(
  studentId: string
): Promise<(Teacher & { course_name?: string })[]> {
  const supabase = await createClient();

  // Get student's enrolled course IDs
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  if (enrollError) {
    console.error("Error fetching enrollments:", enrollError);
    return [];
  }

  // No enrollments is normal for new students - just return empty array
  if (!enrollments?.length) {
    return [];
  }

  const courseIds = enrollments.map((e) => e.course_id);

  // Get teachers assigned to these courses via teacher_assignments
  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select(`
      course_id,
      course:courses (id, name),
      teacher:teacher_profiles (
        id,
        school_id,
        profile_id,
        created_at,
        updated_at,
        profile:profiles (
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .in("course_id", courseIds);

  if (error) {
    console.error("Error fetching teacher assignments:", error);
    return [];
  }

  // Deduplicate teachers and include course names
  const teacherMap = new Map<
    string,
    Teacher & { course_name?: string; course_names: string[] }
  >();

  for (const assignment of assignments || []) {
    const teacher = assignment.teacher as any;
    const course = assignment.course as any;

    if (teacher?.id) {
      const existing = teacherMap.get(teacher.id);
      if (existing) {
        if (course?.name && !existing.course_names.includes(course.name)) {
          existing.course_names.push(course.name);
        }
      } else {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          school_id: teacher.school_id,
          profile_id: teacher.profile_id,
          created_at: teacher.created_at,
          updated_at: teacher.updated_at,
          profile: teacher.profile,
          course_name: course?.name || "",
          course_names: course?.name ? [course.name] : [],
        });
      }
    }
  }

  return Array.from(teacherMap.values()).map((t) => ({
    ...t,
    course_name: t.course_names.join(", "),
  }));
}

// ============================================================================
// GET TEACHER BY PROFILE ID
// ============================================================================

/**
 * Get teacher ID from profile ID (for quota checks)
 */
export async function getTeacherIdByProfileId(
  profileId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (error || !data) return null;
  return data.id;
}
