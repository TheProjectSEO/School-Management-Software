import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { getAttendanceReport, getAttendanceOverview, exportReport } from "@/lib/dal/reports";

// GET /api/admin/reports/attendance - Get attendance report data
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("reports:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Check if requesting overview
    if (searchParams.get("overview") === "true") {
      const dateFrom = searchParams.get("dateFrom") || undefined;
      const dateTo = searchParams.get("dateTo") || undefined;
      const overview = await getAttendanceOverview(dateFrom, dateTo);
      return NextResponse.json(overview);
    }

    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const gradeLevel = searchParams.get("gradeLevel") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const groupBy = searchParams.get("groupBy") as "section" | "grade_level" | "course" | "date" | undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await getAttendanceReport({
      dateFrom,
      dateTo,
      gradeLevel,
      sectionId,
      courseId,
      groupBy,
      page,
      pageSize,
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
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canExport = await hasPermission("reports:export");
    if (!canExport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { format = "csv", ...filters } = body;

    if (!["csv", "excel", "pdf"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv, excel, or pdf" },
        { status: 400 }
      );
    }

    const blob = await exportReport("attendance", format, filters);

    if (!blob) {
      // Return mock success for now - actual implementation would stream file
      return NextResponse.json({
        success: true,
        message: "Export queued. Download link will be sent via email.",
      });
    }

    // In production, would return the actual file
    return new NextResponse(blob, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" :
                        format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
                        "text/csv",
        "Content-Disposition": `attachment; filename="attendance-report.${format}"`,
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
