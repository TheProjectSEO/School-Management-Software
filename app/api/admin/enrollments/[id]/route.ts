import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import {
  getEnrollmentById,
  approveEnrollment,
  dropEnrollment,
  transferEnrollment,
  completeEnrollment,
} from "@/lib/dal/enrollments";

// GET /api/admin/enrollments/[id] - Get a single enrollment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('enrollments:read');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const enrollment = await getEnrollmentById(id);

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // School scope check: admin can only access enrollments in their own school
    if (enrollment.school_id && enrollment.school_id !== auth.admin.schoolId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("Error in GET /api/admin/enrollments/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/enrollments/[id] - Update enrollment (approve, drop, transfer, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('enrollments:update');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing action parameter" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "approve":
        result = await approveEnrollment(id);
        break;

      case "drop":
        const { reason } = data;
        result = await dropEnrollment(id, reason);
        break;

      case "transfer":
        const { newSectionId } = data;
        if (!newSectionId) {
          return NextResponse.json(
            { error: "Missing newSectionId for transfer" },
            { status: 400 }
          );
        }
        result = await transferEnrollment(id, newSectionId);
        break;

      case "complete":
        result = await completeEnrollment(id);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/admin/enrollments/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
