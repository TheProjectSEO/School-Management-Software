import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { bulkUpdateStudentSection, bulkUpdateStudentGrade } from "@/lib/dal/users";

// POST /api/admin/users/students/bulk-section - Update student section or grade (bulk)
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
    const { studentIds, sectionId, gradeLevel, action } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid parameters: studentIds array is required" },
        { status: 400 }
      );
    }

    // Handle section update
    if (action === "update_section" && sectionId) {
      const result = await bulkUpdateStudentSection(studentIds, sectionId);
      return NextResponse.json(result);
    }

    // Handle grade level update
    if (action === "update_grade" && gradeLevel) {
      const result = await bulkUpdateStudentGrade(studentIds, gradeLevel);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'update_section' with sectionId or 'update_grade' with gradeLevel" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/users/students/bulk-section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
