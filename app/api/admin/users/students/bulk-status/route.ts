import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { bulkUpdateStudentStatus } from "@/lib/dal/users";

// POST /api/admin/users/students/bulk-status - Update student status (bulk)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentIds, status } = body;

    if (!studentIds || !Array.isArray(studentIds) || !status) {
      return NextResponse.json(
        { error: "Invalid parameters: studentIds (array) and status are required" },
        { status: 400 }
      );
    }

    if (studentIds.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 records per batch" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["active", "inactive", "suspended", "graduated", "transferred"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await bulkUpdateStudentStatus(studentIds, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/admin/users/students/bulk-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
