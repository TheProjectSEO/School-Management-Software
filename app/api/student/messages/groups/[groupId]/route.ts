import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * GET /api/student/messages/groups/[groupId]
 * Get messages for a specific group chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const authResult = await requireStudentAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { profileId } = authResult.student;
  const { groupId } = await params;

  try {
    const supabase = createServiceClient();

    // Get group messages using RPC
    const { data: messages, error } = await supabase.rpc("get_group_chat_messages", {
      p_group_chat_id: groupId,
      p_profile_id: profileId,
      p_limit: 100,
    });

    if (error) {
      console.error("Error fetching group messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Also get group info
    const { data: groupInfo } = await supabase
      .from("section_group_chats")
      .select("id, name, description")
      .eq("id", groupId)
      .single();

    // Get section info separately (no FK join)
    let sectionInfo = null;
    if (groupInfo) {
      const { data: chatRecord } = await supabase
        .from("section_group_chats")
        .select("section_id")
        .eq("id", groupId)
        .single();

      if (chatRecord?.section_id) {
        const { data: section } = await supabase
          .from("sections")
          .select("id, name, grade_level")
          .eq("id", chatRecord.section_id)
          .single();
        sectionInfo = section;
      }
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from("section_group_chat_members")
      .select("*", { count: "exact", head: true })
      .eq("group_chat_id", groupId);

    return NextResponse.json({
      messages: messages || [],
      group: groupInfo ? { ...groupInfo, section: sectionInfo } : null,
      memberCount: memberCount || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/student/messages/groups/[groupId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/student/messages/groups/[groupId]
 * Send a message to a group chat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const authResult = await requireStudentAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { profileId } = authResult.student;
  const { groupId } = await params;

  try {
    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is a member of this group
    const { data: membership } = await supabase
      .from("section_group_chat_members")
      .select("id, member_role")
      .eq("group_chat_id", groupId)
      .eq("profile_id", profileId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Insert the message
    const { data: newMessage, error } = await supabase
      .from("section_group_chat_messages")
      .insert({
        group_chat_id: groupId,
        sender_profile_id: profileId,
        sender_role: "student",
        body: message.trim(),
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error sending group message:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message_id: newMessage.id,
      created_at: newMessage.created_at,
    });
  } catch (error) {
    console.error("Error in POST /api/student/messages/groups/[groupId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
