import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { bulkUpdateTeacherStatus } from "@/lib/dal/users";

// POST /api/admin/users/teachers/bulk-status - Bulk update teacher status
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
    const { teacherIds, isActive, status } = body;

    if (!teacherIds || !Array.isArray(teacherIds)) {
      return NextResponse.json(
        { error: "Invalid parameters: teacherIds required" },
        { status: 400 }
      );
    }

    // Support both isActive boolean and status string
    const activeStatus = isActive !== undefined ? isActive : status === "active";

    const result = await bulkUpdateTeacherStatus(teacherIds, activeStatus);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/bulk-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
