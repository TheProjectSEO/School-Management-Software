import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getReportCard } from "@/lib/dal/report-cards";

/**
 * GET /api/admin/report-cards/[id]
 * Fetch full report card detail for admin review.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAPI("users:read");
  if (!auth.success) return auth.response;

  const { id } = await params;
  const reportCard = await getReportCard(id);

  if (!reportCard) {
    return NextResponse.json({ error: "Report card not found" }, { status: 404 });
  }

  // Verify it belongs to this school
  if (reportCard.school_id !== auth.admin.schoolId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ reportCard });
}

/**
 * PATCH /api/admin/report-cards/[id]
 * Approve or release a report card.
 *
 * Body: { action: 'approve' | 'release' }
 *
 * Status transitions:
 *   pending_review → approve  → approved
 *   approved       → release  → released  (visible to student)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAPI("users:read");
  if (!auth.success) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (!action || !["approve", "release"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'release'" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Fetch the report card and verify it belongs to this school
  const { data: reportCard, error: fetchError } = await supabase
    .from("report_cards")
    .select("id, status, school_id")
    .eq("id", id)
    .single();

  if (fetchError || !reportCard) {
    return NextResponse.json({ error: "Report card not found" }, { status: 404 });
  }

  if (reportCard.school_id !== auth.admin.schoolId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Validate allowed transitions
  // Admin can approve both draft (self-generated) and pending_review (teacher-submitted)
  if (action === "approve" && !["draft", "pending_review"].includes(reportCard.status)) {
    return NextResponse.json(
      { error: `Cannot approve a report card with status '${reportCard.status}'.` },
      { status: 400 }
    );
  }
  if (action === "release" && reportCard.status !== "approved") {
    return NextResponse.json(
      { error: `Cannot release a report card with status '${reportCard.status}'. Must be 'approved'.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updates =
    action === "approve"
      ? { status: "approved", approved_at: now, approved_by: auth.admin.adminId, updated_at: now }
      : { status: "released", released_at: now, released_by: auth.admin.adminId, updated_at: now };

  const { error: updateError } = await supabase
    .from("report_cards")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Error updating report card:", updateError);
    return NextResponse.json({ error: "Failed to update report card" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    id,
    status: updates.status,
  });
}

/**
 * POST /api/admin/report-cards/[id]
 * Bulk-approve or bulk-release via array of IDs provided in body.
 * Also handles single approve/release via action body param.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Reuse PATCH logic for convenience
  return PATCH(request, { params });
}
