import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { transferEnrollment } from "@/lib/dal/enrollments";

// POST /api/admin/enrollments/[id]/transfer - Transfer enrollment to a different section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("enrollments:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: enrollmentId } = await params;
    const body = await request.json();
    const { newSectionId } = body;

    if (!newSectionId) {
      return NextResponse.json(
        { error: "newSectionId is required" },
        { status: 400 }
      );
    }

    const result = await transferEnrollment(enrollmentId, newSectionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollments/[id]/transfer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
