import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { bulkImportStudents } from "@/lib/dal/users";

// POST /api/admin/users/students/bulk-import - Bulk import students from CSV
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
    const { students } = body;

    if (!students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Invalid request: students array required" },
        { status: 400 }
      );
    }

    if (students.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 records per batch" },
        { status: 400 }
      );
    }

    const result = await bulkImportStudents(students);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/admin/users/students/bulk-import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
