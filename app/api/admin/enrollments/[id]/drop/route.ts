import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { dropEnrollment } from "@/lib/dal/enrollments";

// POST /api/admin/enrollments/[id]/drop - Drop an enrollment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('enrollments:update');
    if (!auth.success) return auth.response;

    const { id: enrollmentId } = await params;
    const body = await request.json();
    const { reason } = body;

    const result = await dropEnrollment(enrollmentId, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollments/[id]/drop:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
