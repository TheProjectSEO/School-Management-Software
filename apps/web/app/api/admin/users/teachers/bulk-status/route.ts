import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { bulkUpdateTeacherStatus } from "@/lib/dal/users";

// POST /api/admin/users/teachers/bulk-status - Update teacher status (bulk)
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
    const { teacherIds, isActive } = body;

    if (!teacherIds || !Array.isArray(teacherIds) || isActive === undefined) {
      return NextResponse.json(
        { error: "Invalid parameters: teacherIds (array) and isActive (boolean) are required" },
        { status: 400 }
      );
    }

    const result = await bulkUpdateTeacherStatus(teacherIds, isActive);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/bulk-status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
