import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import {
  getTeacherCourseAssignments,
  assignTeacherToCourse,
  removeTeacherCourseAssignment,
} from "@/lib/dal/users";

// GET /api/admin/users/teachers/[id]/assignments - Get teacher's course assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const assignments = await getTeacherCourseAssignments(teacherId);

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/teachers/[id]/assignments - Assign teacher to a course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const body = await request.json();
    const { courseId, sectionId, isPrimary = true } = body;

    if (!courseId || !sectionId) {
      return NextResponse.json(
        { error: "courseId and sectionId are required" },
        { status: 400 }
      );
    }

    const result = await assignTeacherToCourse(
      teacherId,
      courseId,
      sectionId,
      isPrimary,
      admin.school_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/teachers/[id]/assignments - Remove a course assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await removeTeacherCourseAssignment(assignmentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
