import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { bulkImportTeachers } from "@/lib/dal/users";

// POST /api/admin/users/teachers/bulk-import - Bulk import teachers from CSV
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await hasPermission("users:create");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { teachers } = body;

    if (!teachers || !Array.isArray(teachers)) {
      return NextResponse.json(
        { error: "Invalid request: teachers array required" },
        { status: 400 }
      );
    }

    const result = await bulkImportTeachers(teachers);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/bulk-import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
