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
    const gradeLevel = searchParams.get("gradeLevel") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await listStudents({
      search,
      status,
      gradeLevel,
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
    const { fullName, email, lrn, gradeLevel, sectionId, phone, birthDate, gender, address, guardianName, guardianPhone, temporaryPassword } = data;

    if (!fullName || !email || !gradeLevel) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, email, gradeLevel" },
        { status: 400 }
      );
    }

    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();

    // Auto-generate LRN if not provided; check duplicate if provided
    let resolvedLrn = lrn;
    if (!resolvedLrn) {
      const currentYear = new Date().getFullYear();
      const prefix = `${currentYear}-MSU-`;
      const { data: lrnRows } = await supabase
        .from("students")
        .select("lrn")
        .eq("school_id", admin.schoolId)
        .like("lrn", `${prefix}%`);

      const lrnPattern = /^\d{4}-MSU-(\d+)$/;
      let maxNumber = 0;
      for (const row of lrnRows ?? []) {
        if (row.lrn) {
          const match = row.lrn.match(lrnPattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        }
      }
      resolvedLrn = `${prefix}${(maxNumber + 1).toString().padStart(4, "0")}`;
    } else {
      const { data: existingLrn } = await supabase
        .from("students")
        .select("id")
        .eq("lrn", resolvedLrn)
        .eq("school_id", admin.schoolId)
        .maybeSingle();
      if (existingLrn) {
        return NextResponse.json(
          { error: "A student with this LRN already exists" },
          { status: 409 }
        );
      }
    }

    const result = await createStudent({
      fullName,
      email,
      lrn: resolvedLrn,
      gradeLevel,
      sectionId,
      phone,
      birthDate,
      gender,
      address,
      guardianName,
      guardianPhone,
      temporaryPassword,
      school_id: admin.schoolId,
    });

    if (!result.success) {
      const isEmailConflict = result.error?.includes('Email already exists');
      return NextResponse.json({ error: result.error }, { status: isEmailConflict ? 409 : 400 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      temporaryPassword: result.temporaryPassword
    }, { status: 201 });
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
