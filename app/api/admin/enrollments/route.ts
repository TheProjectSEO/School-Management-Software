import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin, requireAdminAPI } from "@/lib/dal/admin";
import {
  listEnrollments,
  listGroupedStudentEnrollments,
  createEnrollment,
  bulkEnroll,
  getEnrollmentStats,
} from "@/lib/dal/enrollments";
import { createServiceClient } from "@/lib/supabase/service";

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
    const view = searchParams.get("view");

    // Flat view (legacy) - one row per enrollment
    if (view === "flat") {
      const result = await listEnrollments({
        search,
        status,
        courseId,
        sectionId,
        page,
        pageSize,
      });

      const transformedData = result.data.map((enrollment: any) => ({
        id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: enrollment.student?.profile?.full_name || "Unknown",
        student_email: enrollment.student?.profile?.email || "",
        course_id: enrollment.course_id,
        course_name: enrollment.course?.name || "Unknown",
        course_code: enrollment.course?.subject_code || "",
        section_id: enrollment.section_id,
        section_name: enrollment.section?.name || "Unknown",
        status: enrollment.status || "active",
        enrolled_at: enrollment.enrolled_at,
      }));

      return NextResponse.json({ ...result, data: transformedData });
    }

    // Default: Grouped view - one row per student with nested courses
    const result = await listGroupedStudentEnrollments({
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

      if (!sectionId || !studentIds || !Array.isArray(studentIds)) {
        return NextResponse.json(
          { error: "Missing required fields for bulk enrollment" },
          { status: 400 }
        );
      }

      if (studentIds.length > 500) {
        return NextResponse.json(
          { error: "Maximum 500 records per batch" },
          { status: 400 }
        );
      }

      // Get school_id from admin context
      const adminAuth = await requireAdminAPI("enrollments:create");
      const schoolId = adminAuth.success ? adminAuth.admin.schoolId : undefined;

      // If courseId provided, enroll in that specific course
      if (courseId) {
        const result = await bulkEnroll({ courseId, sectionId, studentIds, schoolId, academicYearId });
        return NextResponse.json(result);
      }

      // No courseId: look up all courses assigned to this section via teacher_assignments
      const supabase = createServiceClient();
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("course_id")
        .eq("section_id", sectionId);

      const courseIds = [...new Set((assignments || []).map((a: { course_id: string }) => a.course_id))];

      if (courseIds.length === 0) {
        return NextResponse.json(
          { error: "No subjects are assigned to this section yet. Please assign subjects first." },
          { status: 400 }
        );
      }

      // Enroll in each course, merge results
      let totalSuccess = 0;
      let totalFailed = 0;
      const allErrors: { studentId: string; studentName: string; message: string }[] = [];

      for (const cId of courseIds) {
        const result = await bulkEnroll({ courseId: cId, sectionId, studentIds, schoolId, academicYearId });
        totalSuccess += result.success;
        totalFailed += result.failed;
        allErrors.push(...result.errors);
      }

      // Deduplicate errors by studentId (only show each student once)
      const seen = new Set<string>();
      const dedupedErrors = allErrors.filter((e) => {
        if (!e.studentId || seen.has(e.studentId)) return false;
        seen.add(e.studentId);
        return true;
      });

      return NextResponse.json({ success: totalSuccess, failed: totalFailed, errors: dedupedErrors });
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
