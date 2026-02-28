import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/admin/report-cards/bulk
 * Bulk approve or release multiple report cards at once.
 *
 * Body: { ids: string[], action: 'approve' | 'release' }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAPI("users:read");
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { ids, action } = body as { ids?: string[]; action?: string };

  if (!ids?.length) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }
  if (!action || !["approve", "release"].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'release'" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const fromStatus = action === "approve" ? "pending_review" : "approved";
  const updates =
    action === "approve"
      ? { status: "approved", approved_at: now, approved_by: auth.admin.adminId, updated_at: now }
      : { status: "released", released_at: now, released_by: auth.admin.adminId, updated_at: now };

  const { data, error } = await supabase
    .from("report_cards")
    .update(updates)
    .in("id", ids)
    .eq("status", fromStatus)
    .eq("school_id", auth.admin.schoolId)
    .select("id");

  if (error) {
    console.error("Error bulk updating report cards:", error);
    return NextResponse.json({ error: "Failed to update report cards" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    updated: data?.length || 0,
    action,
  });
}
