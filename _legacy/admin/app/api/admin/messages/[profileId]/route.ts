import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    profileId: string;
  }>;
}

/**
 * GET /api/admin/messages/[profileId]
 * Get message thread with a specific user (student or teacher)
 * Uses SECURITY DEFINER RPC to bypass RLS
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { profileId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // Use RPC function that bypasses RLS
    const { data, error } = await supabase.rpc("admin_get_message_thread", {
      target_profile_id: profileId,
      page_num: page,
      page_size: pageSize,
    });

    if (error) {
      console.error("Error fetching message thread via RPC:", error);
      if (error.message?.includes("Access denied")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message?.includes("Partner not found")) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Get total count and participant info from first row
    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;
    const partnerInfo = data && data.length > 0 ? {
      name: data[0].partner_name as string,
      role: data[0].partner_role as "student" | "teacher",
      id: data[0].partner_entity_id as string,
    } : null;

    // Format messages
    const formattedMessages = (data || []).map((msg: Record<string, unknown>) => ({
      id: msg.message_id as string,
      subject: msg.subject as string,
      body: msg.body as string,
      attachments: msg.attachments_json || [],
      isRead: msg.is_read as boolean,
      readAt: msg.read_at as string | null,
      createdAt: msg.created_at as string,
      fromAdmin: msg.from_admin as boolean,
      fromName: msg.from_name as string,
      parentMessageId: msg.parent_message_id as string | null,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      participant: partnerInfo,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/[profileId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
