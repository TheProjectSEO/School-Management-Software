import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/messages/conversations
 * List all conversations with students and teachers
 * Supports pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search");

    // Get all unique conversation participants
    // A conversation exists if there's at least one message between admin and user
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Query messages where admin is sender or receiver
    let conversationsQuery = supabase
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
        is_read,
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
      .eq("school_id", admin.school_id)
      .or(`admin_id.eq.${admin.id}`)
      .order("created_at", { ascending: false });

    if (search) {
      // Search by participant name or message subject
      conversationsQuery = conversationsQuery.or(
        `subject.ilike.%${search}%,body.ilike.%${search}%`
      );
    }

    const { data: messages, count, error } = await conversationsQuery
      .range(from, to);

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Group messages by conversation participant
    const conversationMap = new Map<string, {
      profileId: string;
      name: string;
      role: "student" | "teacher";
      lastMessage: {
        id: string;
        subject: string;
        body: string;
        isRead: boolean;
        createdAt: string;
        fromAdmin: boolean;
      };
      unreadCount: number;
    }>();

    for (const message of messages || []) {
      const isFromAdmin = message.admin_id === admin.id;

      let participantId: string | null = null;
      let participantName = "";
      let participantRole: "student" | "teacher" = "student";

      // Determine the other participant
      if (isFromAdmin) {
        // Admin sent this message
        if (message.to_student_id) {
          participantId = message.to_student_id;
          participantName = (Array.isArray(message.students_to) && message.students_to[0] && Array.isArray(message.students_to[0].profiles)
            ? message.students_to[0].profiles[0]?.full_name
            : null) || "Unknown Student";
          participantRole = "student";
        } else if (message.to_teacher_id) {
          participantId = message.to_teacher_id;
          participantName = "Teacher"; // TODO: Get actual teacher name
          participantRole = "teacher";
        }
      } else {
        // Admin received this message
        if (message.from_student_id) {
          participantId = message.from_student_id;
          participantName = (Array.isArray(message.students) && message.students[0] && Array.isArray(message.students[0].profiles)
            ? message.students[0].profiles[0]?.full_name
            : null) || "Unknown Student";
          participantRole = "student";
        } else if (message.from_teacher_id) {
          participantId = message.from_teacher_id;
          participantName = "Teacher"; // TODO: Get actual teacher name
          participantRole = "teacher";
        }
      }

      if (!participantId) continue;

      const key = `${participantRole}-${participantId}`;
      const existing = conversationMap.get(key);

      if (!existing) {
        conversationMap.set(key, {
          profileId: participantId,
          name: participantName,
          role: participantRole,
          lastMessage: {
            id: message.id,
            subject: message.subject,
            body: message.body,
            isRead: message.is_read,
            createdAt: message.created_at,
            fromAdmin: isFromAdmin,
          },
          unreadCount: !isFromAdmin && !message.is_read ? 1 : 0,
        });
      } else {
        // Update unread count
        if (!isFromAdmin && !message.is_read) {
          existing.unreadCount++;
        }
      }
    }

    // Convert map to array
    const conversations = Array.from(conversationMap.values());

    return NextResponse.json({
      data: conversations,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
