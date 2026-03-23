import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAPI } from "@/lib/dal/admin";

/**
 * GET /api/admin/messages/conversations
 * List all conversations for the admin using get_user_conversations RPC
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // Use the existing get_user_conversations RPC
    const { data, error } = await supabase.rpc("get_user_conversations", {
      p_profile_id: admin.profileId,
      p_limit: pageSize,
    });

    if (error) {
      console.error("Error fetching conversations:", error);
      // Fallback to direct query if RPC doesn't exist
      return await getConversationsDirect(supabase, admin.profileId, page, pageSize);
    }

    // Transform to expected format
    const conversations = (data || []).map((row: Record<string, unknown>) => ({
      partner_profile_id: row.partner_profile_id as string,
      name: row.partner_name as string || "Unknown",
      partner_name: row.partner_name as string || "Unknown",
      partner_avatar_url: row.partner_avatar_url as string | null,
      role: row.partner_role as string || "unknown",
      partner_role: row.partner_role as string || "unknown",
      last_message_body: row.last_message_body as string || "",
      last_message_at: row.last_message_at as string,
      last_message_sender_type: row.last_message_sender_type as string,
      unread_count: Number(row.unread_count) || 0,
      total_messages: Number(row.total_messages) || 0,
    }));

    return NextResponse.json({
      data: conversations,
      total: conversations.length,
      page,
      pageSize,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Fallback: direct query if RPC doesn't exist
 */
async function getConversationsDirect(
  supabase: ReturnType<typeof createServiceClient>,
  adminProfileId: string,
  page: number,
  pageSize: number
) {
  try {
    // Get all messages involving this admin
    const { data: messages, error } = await supabase
      .from("teacher_direct_messages")
      .select("id, from_profile_id, to_profile_id, body, sender_type, is_read, created_at")
      .or(`from_profile_id.eq.${adminProfileId},to_profile_id.eq.${adminProfileId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Direct query error:", error);
      return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
    }

    // Group by partner
    const partnerMap = new Map<string, {
      partnerId: string;
      lastBody: string;
      lastAt: string;
      lastSenderType: string;
      unread: number;
      total: number;
    }>();

    for (const msg of messages || []) {
      const partnerId = msg.from_profile_id === adminProfileId
        ? msg.to_profile_id
        : msg.from_profile_id;

      const existing = partnerMap.get(partnerId);
      if (!existing) {
        partnerMap.set(partnerId, {
          partnerId,
          lastBody: msg.body,
          lastAt: msg.created_at,
          lastSenderType: msg.sender_type,
          unread: (msg.to_profile_id === adminProfileId && !msg.is_read) ? 1 : 0,
          total: 1,
        });
      } else {
        existing.total++;
        if (msg.to_profile_id === adminProfileId && !msg.is_read) {
          existing.unread++;
        }
      }
    }

    // Get profile data for all partners
    const partnerIds = Array.from(partnerMap.keys());
    if (partnerIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
    }

    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Determine partner roles
    const { data: teachers } = await supabase
      .from("teacher_profiles")
      .select("profile_id")
      .in("profile_id", partnerIds);

    const { data: students } = await supabase
      .from("students")
      .select("profile_id")
      .in("profile_id", partnerIds);

    const teacherSet = new Set((teachers || []).map((t) => t.profile_id));
    const studentSet = new Set((students || []).map((s) => s.profile_id));

    const conversations = Array.from(partnerMap.values()).map((conv) => {
      const profile = profileMap.get(conv.partnerId);
      const role = teacherSet.has(conv.partnerId)
        ? "teacher"
        : studentSet.has(conv.partnerId)
          ? "student"
          : "unknown";

      return {
        partner_profile_id: conv.partnerId,
        name: profile?.full_name || "Unknown",
        partner_name: profile?.full_name || "Unknown",
        partner_avatar_url: profile?.avatar_url || null,
        role,
        partner_role: role,
        last_message_body: conv.lastBody,
        last_message_at: conv.lastAt,
        last_message_sender_type: conv.lastSenderType,
        unread_count: conv.unread,
        total_messages: conv.total,
      };
    });

    // Sort by last message time (newest first)
    conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    return NextResponse.json({
      data: conversations,
      total: conversations.length,
      page,
      pageSize,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Fallback conversations error:", error);
    return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
  }
}
