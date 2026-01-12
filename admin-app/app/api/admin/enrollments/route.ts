import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  listEnrollments,
  createEnrollment,
  bulkEnroll,
  getEnrollmentStats,
} from "@/lib/dal/enrollments";

// GET /api/admin/enrollments - List enrollments with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("enrollments:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Check if requesting stats
    if (searchParams.get("stats") === "true") {
      const stats = await getEnrollmentStats();
      return NextResponse.json(stats);
    }

    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await listEnrollments({
      search,
      status,
      courseId,
      sectionId,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/enrollments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/enrollments - Create enrollment(s)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await hasPermission("enrollments:create");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle bulk enrollment
    if (action === "bulk_enroll") {
      const { courseId, sectionId, studentIds, academicYearId } = data;

      if (!courseId || !sectionId || !studentIds || !Array.isArray(studentIds)) {
        return NextResponse.json(
          { error: "Missing required fields for bulk enrollment" },
          { status: 400 }
        );
      }

      const result = await bulkEnroll({
        courseId,
        sectionId,
        studentIds,
        academicYearId,
      });

      return NextResponse.json(result);
    }

    // Single enrollment
    const { studentId, courseId, sectionId, academicYearId } = data;

    if (!studentId || !courseId || !sectionId) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, courseId, sectionId" },
        { status: 400 }
      );
    }

    const result = await createEnrollment({
      studentId,
      courseId,
      sectionId,
      academicYearId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
