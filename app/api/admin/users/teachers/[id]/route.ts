import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin, verifyAdminPassword } from "@/lib/dal/admin";
import {
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
  updateTeacherEmail,
  CreateTeacherInput,
} from "@/lib/dal/users";

// GET /api/admin/users/teachers/[id] - Get a single teacher
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
    const teacher = await getTeacherById(id);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/teachers/[id] - Update a teacher
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

    // Handle email change separately (requires admin password)
    if (body.email !== undefined && body.adminPassword === undefined) {
      return NextResponse.json(
        { error: 'Admin password is required to change email', code: 'ADMIN_PASSWORD_REQUIRED' },
        { status: 400 }
      );
    }

    if (body.email !== undefined && body.adminPassword !== undefined) {
      // Verify admin password first
      const verifyResult = await verifyAdminPassword(admin.email, body.adminPassword);
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: "Invalid admin password", code: "INVALID_PASSWORD" },
          { status: 401 }
        );
      }

      // Update the email
      const emailResult = await updateTeacherEmail(id, body.email);
      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error, code: "EMAIL_UPDATE_FAILED" },
          { status: 400 }
        );
      }
    }

    // Map from camelCase body to snake_case for UpdateTeacherInput
    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) updates.full_name = body.fullName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.employeeId !== undefined) updates.employee_id = body.employeeId;
    if (body.department !== undefined) updates.department = body.department;
    if (body.specialization !== undefined) updates.specialization = body.specialization;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    // Only call updateTeacher if there are non-email updates
    if (Object.keys(updates).length > 0) {
      const result = await updateTeacher(id, updates);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/users/teachers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/teachers/[id] - Update teacher status
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
    const { isActive } = body;

    if (isActive === undefined) {
      return NextResponse.json(
        { error: "Missing isActive parameter" },
        { status: 400 }
      );
    }

    const result = await updateTeacherStatus(id, isActive);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/teachers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
