import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  getStudentById,
  updateStudent,
  updateStudentStatus,
  CreateStudentInput,
} from "@/lib/dal/users";

// GET /api/admin/users/students/[id] - Get a single student
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

    const { id } = await params;
    const student = await getStudentById(id);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error in GET /api/admin/users/students/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/students/[id] - Update a student
export async function PUT(
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

    const { id } = await params;
    const body = await request.json();

    // Map from camelCase body to snake_case for UpdateStudentInput
    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) updates.full_name = body.fullName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.lrn !== undefined) updates.lrn = body.lrn;
    if (body.gradeLevel !== undefined) updates.grade_level = body.gradeLevel;
    if (body.sectionId !== undefined) updates.section_id = body.sectionId;

    const result = await updateStudent(id, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/users/students/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/students/[id] - Update student status
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "inactive", "graduated", "transferred"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const result = await updateStudentStatus(id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/students/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
