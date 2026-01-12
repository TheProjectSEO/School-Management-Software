import { NextRequest, NextResponse } from "next/server";
import { listStudents, hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  createStudent,
  updateStudentStatus,
  bulkUpdateStudentStatus,
  bulkImportStudents,
  CreateStudentInput,
} from "@/lib/dal/users";

// GET /api/admin/users/students - List students with pagination and filters
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
    const sectionId = searchParams.get("sectionId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await listStudents({
      search,
      status,
      sectionId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/users/students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/students - Create a new student
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
      const { studentIds, status } = data;
      if (!studentIds || !Array.isArray(studentIds) || !status) {
        return NextResponse.json(
          { error: "Invalid bulk update parameters" },
          { status: 400 }
        );
      }
      const result = await bulkUpdateStudentStatus(studentIds, status);
      return NextResponse.json(result);
    }

    if (action === "bulk_import") {
      const { students } = data;
      if (!students || !Array.isArray(students)) {
        return NextResponse.json(
          { error: "Invalid import data" },
          { status: 400 }
        );
      }
      const result = await bulkImportStudents(students as CreateStudentInput[]);
      return NextResponse.json(result);
    }

    // Regular create
    const { fullName, email, lrn, gradeLevel, sectionId, phone, birthDate, gender, address, guardianName, guardianPhone } = data;

    if (!fullName || !email || !gradeLevel) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, email, gradeLevel" },
        { status: 400 }
      );
    }

    const result = await createStudent({
      fullName,
      email,
      lrn,
      gradeLevel,
      sectionId,
      phone,
      birthDate,
      gender,
      address,
      guardianName,
      guardianPhone,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/users/students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/students - Update student status (bulk)
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
    const { studentIds, status } = body;

    if (!studentIds || !Array.isArray(studentIds) || !status) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const result = await bulkUpdateStudentStatus(studentIds, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
