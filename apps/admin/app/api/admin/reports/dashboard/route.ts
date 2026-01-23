import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import {
  getDashboardStats,
  getRecentActivity,
  getEnrollmentTrends,
  getGradeDistribution,
  getAttendanceOverview,
} from "@/lib/dal/reports";

// GET /api/admin/reports/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dashboard data is available to all authenticated admins
    const canRead = await hasPermission("reports:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Return specific data type if requested
    switch (type) {
      case "stats":
        const stats = await getDashboardStats();
        return NextResponse.json(stats);

      case "activity":
        const limit = parseInt(searchParams.get("limit") || "10");
        const activity = await getRecentActivity(limit);
        return NextResponse.json(activity);

      case "enrollment_trends":
        const months = parseInt(searchParams.get("months") || "6");
        const trends = await getEnrollmentTrends(months);
        return NextResponse.json(trends);

      case "grade_distribution":
        const gradingPeriod = searchParams.get("gradingPeriod") || undefined;
        const distribution = await getGradeDistribution(gradingPeriod);
        return NextResponse.json(distribution);

      case "attendance_overview":
        const dateFrom = searchParams.get("dateFrom") || undefined;
        const dateTo = searchParams.get("dateTo") || undefined;
        const overview = await getAttendanceOverview(dateFrom, dateTo);
        return NextResponse.json(overview);

      default:
        // Return all dashboard data
        const [
          dashboardStats,
          recentActivity,
          enrollmentTrends,
          gradeDistribution,
          attendanceOverview,
        ] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(10),
          getEnrollmentTrends(6),
          getGradeDistribution(),
          getAttendanceOverview(),
        ]);

        return NextResponse.json({
          stats: dashboardStats,
          recentActivity,
          enrollmentTrends,
          gradeDistribution,
          attendanceOverview,
        });
    }
  } catch (error) {
    console.error("Error in GET /api/admin/reports/dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
