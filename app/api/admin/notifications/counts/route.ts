import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/admin/notifications/counts
// Returns unread message count and pending application count for the admin
export async function GET() {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;

    const supabase = createServiceClient();

    // Fetch unread message count via RPC
    let unreadMessages = 0;
    try {
      const { data: msgData } = await supabase.rpc("get_unread_count", {
        p_profile_id: auth.admin.profileId,
      });
      unreadMessages = msgData || 0;
    } catch {
      // RPC may not exist yet — ignore
    }

    // Fetch pending (submitted) applications count
    let pendingApplications = 0;
    try {
      const { count } = await supabase
        .from("student_applications")
        .select("*", { count: "exact", head: true })
        .eq("school_id", auth.admin.schoolId)
        .eq("status", "submitted");
      pendingApplications = count || 0;
    } catch {
      // Table may not exist yet — ignore
    }

    return NextResponse.json({ unreadMessages, pendingApplications });
  } catch (error) {
    console.error("Error in GET /api/admin/notifications/counts:", error);
    return NextResponse.json({ unreadMessages: 0, pendingApplications: 0 });
  }
}
