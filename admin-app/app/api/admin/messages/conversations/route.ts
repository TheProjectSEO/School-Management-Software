import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/messages/conversations
 * List all conversations with students and teachers
 * Uses SECURITY DEFINER RPC to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search");

    // Use RPC function that bypasses RLS
    const { data, error } = await supabase.rpc("admin_get_conversations", {
      page_num: page,
      page_size: pageSize,
      search_query: search || null,
    });

    if (error) {
      console.error("Error fetching conversations via RPC:", error);
      if (error.message?.includes("Access denied")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Get total count from first row (all rows have same total_count)
    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

    // Transform RPC results to expected format
    const conversations = (data || []).map((row: Record<string, unknown>) => ({
      profileId: row.partner_profile_id as string,
      partner_profile_id: row.partner_profile_id as string,
      name: row.partner_name as string || "Unknown",
      role: row.partner_role as "student" | "teacher",
      lastMessage: {
        id: row.last_message_id as string,
        subject: row.last_message_subject as string,
        body: row.last_message_body as string,
        isRead: row.last_message_is_read as boolean,
        createdAt: row.last_message_created_at as string,
        fromAdmin: row.last_message_from_admin as boolean,
      },
      unreadCount: Number(row.unread_count) || 0,
    }));

    return NextResponse.json({
      data: conversations,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
