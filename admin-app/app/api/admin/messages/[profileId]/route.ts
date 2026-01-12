import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    profileId: string;
  }>;
}

/**
 * GET /api/admin/messages/[profileId]
 * Get message thread with a specific user (student or teacher)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // Determine if profileId is a student or teacher
    // First check if it's a student
    const { data: student } = await supabase
      .from("students")
      .select("id, profile_id")
      .eq("id", profileId)
      .single();

    const isStudent = !!student;

    // Build query to get messages between admin and this user
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let messagesQuery = supabase
      .from("direct_messages")
      .select(`
        id,
        from_student_id,
        to_student_id,
        from_teacher_id,
        to_teacher_id,
        admin_id,
        subject,
        body,
        attachments_json,
        is_read,
        read_at,
        parent_message_id,
        created_at,
        students!direct_messages_from_student_id_fkey(
          id,
          profile_id,
          profiles(id, full_name)
        ),
        students_to:students!direct_messages_to_student_id_fkey(
          id,
          profile_id,
          profiles(id, full_name)
        )
      `, { count: "exact" })
      .eq("school_id", admin.school_id);

    if (isStudent) {
      // Messages between admin and student
      messagesQuery = messagesQuery.or(
        `and(admin_id.eq.${admin.id},to_student_id.eq.${profileId}),and(from_student_id.eq.${profileId},admin_id.is.null)`
      );
    } else {
      // Messages between admin and teacher
      messagesQuery = messagesQuery.or(
        `and(admin_id.eq.${admin.id},to_teacher_id.eq.${profileId}),and(from_teacher_id.eq.${profileId},admin_id.is.null)`
      );
    }

    const { data: messages, count, error } = await messagesQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching message thread:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Format messages
    const formattedMessages = (messages || []).map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      body: msg.body,
      attachments: msg.attachments_json || [],
      isRead: msg.is_read,
      readAt: msg.read_at,
      createdAt: msg.created_at,
      fromAdmin: !!msg.admin_id,
      fromName: msg.admin_id
        ? admin.profile?.full_name || "Admin"
        : (Array.isArray(msg.students) && msg.students[0] && Array.isArray(msg.students[0].profiles)
            ? msg.students[0].profiles[0]?.full_name
            : null) ||
          (Array.isArray(msg.students_to) && msg.students_to[0] && Array.isArray(msg.students_to[0].profiles)
            ? msg.students_to[0].profiles[0]?.full_name
            : null) ||
          "Unknown",
      parentMessageId: msg.parent_message_id,
    }));

    // Mark unread messages as read (messages TO admin)
    const unreadMessageIds = (messages || [])
      .filter((msg) => !msg.is_read && !msg.admin_id)
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .in("id", unreadMessageIds);
    }

    // Get participant info
    let participantInfo = null;
    if (isStudent) {
      const { data: studentProfile } = await supabase
        .from("students")
        .select(`
          id,
          lrn,
          grade_level,
          profiles(id, full_name, email:auth_users(email))
        `)
        .eq("id", profileId)
        .single();

      participantInfo = {
        id: studentProfile?.id,
        name: (Array.isArray(studentProfile?.profiles)
          ? studentProfile.profiles[0]?.full_name
          : null) || "Unknown",
        role: "student" as const,
        lrn: studentProfile?.lrn,
        gradeLevel: studentProfile?.grade_level,
      };
    } else {
      // TODO: Get teacher profile when teacher system is integrated
      participantInfo = {
        id: profileId,
        name: "Teacher",
        role: "teacher" as const,
      };
    }

    return NextResponse.json({
      messages: formattedMessages,
      participant: participantInfo,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/[profileId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
