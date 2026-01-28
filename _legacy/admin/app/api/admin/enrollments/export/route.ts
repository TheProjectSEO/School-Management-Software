import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { listEnrollments } from "@/lib/dal/enrollments";

// GET /api/admin/enrollments/export - Export enrollments list
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
    const format = searchParams.get("format") || "csv";
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;

    // Get all enrollments (no pagination for export)
    const result = await listEnrollments({
      search,
      status,
      courseId,
      sectionId,
      page: 1,
      pageSize: 10000, // Get all
    });

    const enrollments = result.data || [];

    // Transform data
    const transformedData = enrollments.map((enrollment: any) => ({
      id: enrollment.id,
      student_name: enrollment.students?.profiles?.full_name || "Unknown",
      student_email: enrollment.students?.profiles?.email || "",
      course_name: enrollment.courses?.name || "Unknown",
      course_code: enrollment.courses?.code || enrollment.courses?.subject_code || "",
      section_name: enrollment.sections?.name || "Unknown",
      status: enrollment.status || "active",
      enrolled_at: enrollment.enrolled_at,
    }));

    if (format === "csv") {
      // Generate CSV
      const headers = ["ID", "Student Name", "Student Email", "Course", "Course Code", "Section", "Status", "Enrolled At"];
      const rows = transformedData.map((e: any) => [
        e.id,
        e.student_name,
        e.student_email,
        e.course_name,
        e.course_code,
        e.section_name,
        e.status,
        e.enrolled_at || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=enrollments-export.csv",
        },
      });
    }

    // For Excel/PDF, return JSON
    return NextResponse.json({ data: transformedData, format });
  } catch (error) {
    console.error("Error in GET /api/admin/enrollments/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
