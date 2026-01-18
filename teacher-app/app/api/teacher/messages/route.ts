// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/messages
 * Get message conversations for teacher
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { userId } = authResult.context;
  const { searchParams } = new URL(request.url);
  const conversationWith = searchParams.get("with"); // User ID to get conversation with

  try {
    const supabase = await createClient();

    if (conversationWith) {
      // Get messages with a specific user
      const { data: messages, error } = await supabase
        .from("teacher_direct_messages")
        .select(
          `
          *,
          from_user_profile:profiles!from_user(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          to_user_profile:profiles!to_user(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .or(
          `and(from_user.eq.${userId},to_user.eq.${conversationWith}),and(from_user.eq.${conversationWith},to_user.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
          { error: "Failed to fetch messages" },
          { status: 500 }
        );
      }

      return NextResponse.json({ messages });
    } else {
      // Get all conversations (grouped by other user)
      const { data: messages, error } = await supabase
        .from("teacher_direct_messages")
        .select(
          `
          *,
          from_user_profile:profiles!from_user(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          to_user_profile:profiles!to_user(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        return NextResponse.json(
          { error: "Failed to fetch conversations" },
          { status: 500 }
        );
      }

      // Group by conversation partner
      const conversationsMap = new Map();

      messages?.forEach((msg) => {
        const partnerId = msg.from_user === userId ? msg.to_user : msg.from_user;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            partnerId,
            partner:
              msg.from_user === userId
                ? msg.to_user_profile
                : msg.from_user_profile,
            lastMessage: msg,
            unreadCount: 0,
          });
        }

        // Count unread messages (where current user is recipient and not read)
        if (msg.to_user === userId && !msg.read_at) {
          const conv = conversationsMap.get(partnerId);
          conv.unreadCount++;
        }
      });

      const conversations = Array.from(conversationsMap.values());

      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
