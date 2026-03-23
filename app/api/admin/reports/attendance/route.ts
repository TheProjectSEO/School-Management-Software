import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { getAttendanceReport, getAttendanceOverview, exportReport } from "@/lib/dal/reports";

// GET /api/admin/reports/attendance - Get attendance report data
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('reports:read');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);

    // Check if requesting overview
    if (searchParams.get("overview") === "true") {
      const schoolId = searchParams.get("schoolId") || undefined;
      const overview = await getAttendanceOverview(schoolId);
      return NextResponse.json(overview);
    }

    const startDate = searchParams.get("dateFrom") || searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("dateTo") || searchParams.get("endDate") || undefined;
    const schoolId = searchParams.get("schoolId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const status = searchParams.get("status") as 'present' | 'absent' | 'late' | 'excused' | undefined;

    const result = await getAttendanceReport({
      schoolId,
      sectionId,
      courseId,
      studentId,
      startDate,
      endDate,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/reports/attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/reports/attendance - Export attendance report
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI('reports:read');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { format = "csv", ...filters } = body;

    if (!["csv", "excel", "pdf"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv, excel, or pdf" },
        { status: 400 }
      );
    }

    const result = await exportReport("attendance", format, filters);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Export failed" },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json({
        success: true,
        message: "No data to export.",
      });
    }

    // Return the exported data
    const contentType = format === "pdf" ? "application/pdf" :
                        format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
                        "text/csv";

    return new NextResponse(result.data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="attendance-report.${format === "excel" ? "xlsx" : format}"`,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/admin/reports/attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
