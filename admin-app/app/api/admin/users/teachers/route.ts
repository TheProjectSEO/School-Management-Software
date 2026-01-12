import { NextRequest, NextResponse } from "next/server";
import { listTeachers, hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  createTeacher,
  bulkUpdateTeacherStatus,
  bulkImportTeachers,
  CreateTeacherInput,
} from "@/lib/dal/users";

// GET /api/admin/users/teachers - List teachers with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await listTeachers({
      search,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/teachers - Create a new teacher
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
    const { action, ...data } = body;

    // Handle bulk actions
    if (action === "bulk_status_update") {
      const { teacherIds, isActive } = data;
      if (!teacherIds || !Array.isArray(teacherIds) || isActive === undefined) {
        return NextResponse.json(
          { error: "Invalid bulk update parameters" },
          { status: 400 }
        );
      }
      const result = await bulkUpdateTeacherStatus(teacherIds, isActive);
      return NextResponse.json(result);
    }

    if (action === "bulk_import") {
      const { teachers } = data;
      if (!teachers || !Array.isArray(teachers)) {
        return NextResponse.json(
          { error: "Invalid import data" },
          { status: 400 }
        );
      }
      const result = await bulkImportTeachers(teachers as CreateTeacherInput[]);
      return NextResponse.json(result);
    }

    // Regular create
    const { fullName, email, employeeId, department, specialization, phone, hireDate } = data;

    if (!fullName || !email || !employeeId) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, email, employeeId" },
        { status: 400 }
      );
    }

    const result = await createTeacher({
      fullName,
      email,
      employeeId,
      department,
      specialization,
      phone,
      hireDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/teachers - Update teacher status (bulk)
export async function PATCH(request: NextRequest) {
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
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const result = await bulkUpdateTeacherStatus(teacherIds, isActive);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
