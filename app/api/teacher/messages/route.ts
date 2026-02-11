/**
 * GET /api/teacher/messages
 * Get conversations list for teacher with transformed data
 */
import { NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/dal/teacher";
import {
  getTeacherConversations,
  getUnreadMessageCount,
} from "@/lib/dal/messages";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const teacherProfile = await getTeacherProfile();
    if (!teacherProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rawConversations, unreadCount] = await Promise.all([
      getTeacherConversations(teacherProfile.id),
      getUnreadMessageCount(teacherProfile.id),
    ]);

    // Transform conversations to match frontend expected format
    const conversations = rawConversations.map((conv) => ({
      id: conv.partner_profile_id, // Use partner_profile_id as unique ID
      participantId: conv.partner_profile_id,
      participantName: conv.partner_name,
      participantRole: conv.partner_role === 'student' ? 'Student' : conv.partner_role === 'admin' ? 'Admin' : conv.partner_role,
      lastMessage: conv.last_message_body || '',
      lastMessageTime: conv.last_message_at,
      unreadCount: conv.unread_count,
      studentProfileId: conv.partner_profile_id,
      studentId: conv.student_id,
      sectionName: conv.section_name,
      gradeLevel: conv.grade_level,
    }));

    return NextResponse.json({
      conversations,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
