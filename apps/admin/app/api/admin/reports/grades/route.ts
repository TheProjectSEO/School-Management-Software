import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { getGradeReport, getGradeDistribution, exportReport } from "@/lib/dal/reports";

// GET /api/admin/reports/grades - Get grades report data
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

    // Check if requesting distribution
    if (searchParams.get("distribution") === "true") {
      const gradingPeriod = searchParams.get("gradingPeriod") || undefined;
      const distribution = await getGradeDistribution(gradingPeriod);
      return NextResponse.json(distribution);
    }

    const gradingPeriod = searchParams.get("gradingPeriod") || undefined;
    const gradeLevel = searchParams.get("gradeLevel") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await getGradeReport({
      gradingPeriod,
      gradeLevel,
      courseId,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/admin/reports/grades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/reports/grades - Export grades report
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

    const blob = await exportReport("grades", format, filters);

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
        "Content-Disposition": `attachment; filename="grades-report.${format}"`,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/admin/reports/grades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
