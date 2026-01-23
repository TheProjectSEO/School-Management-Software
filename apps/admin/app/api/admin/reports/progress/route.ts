import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { getProgressReport, getEnrollmentTrends, exportReport } from "@/lib/dal/reports";

// GET /api/admin/reports/progress - Get progress report data
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

    // Check if requesting enrollment trends
    if (searchParams.get("trends") === "true") {
      const months = parseInt(searchParams.get("months") || "6");
      const trends = await getEnrollmentTrends(months);
      return NextResponse.json(trends);
    }

    const academicYear = searchParams.get("academicYear") || undefined;
    const semester = searchParams.get("semester") || undefined;
    const gradeLevel = searchParams.get("gradeLevel") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await getProgressReport({
      academicYear,
      semester,
      gradeLevel,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/reports/progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/reports/progress - Export progress report
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

    const blob = await exportReport("progress", format, filters);

    if (!blob) {
      return NextResponse.json({
        success: true,
        message: "Export queued. Download link will be sent via email.",
      });
    }

    return new NextResponse(blob, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" :
                        format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
                        "text/csv",
        "Content-Disposition": `attachment; filename="progress-report.${format}"`,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/admin/reports/progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
