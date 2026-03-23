import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { approveEnrollment } from "@/lib/dal/enrollments";

// POST /api/admin/enrollments/[id]/approve - Approve a pending enrollment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('enrollments:update');
    if (!auth.success) return auth.response;

    const { id: enrollmentId } = await params;
    const result = await approveEnrollment(enrollmentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollments/[id]/approve:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
