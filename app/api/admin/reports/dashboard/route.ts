import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
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
    const auth = await requireAdminAPI('reports:read');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const schoolId = searchParams.get("schoolId") || undefined;

    // Return specific data type if requested
    switch (type) {
      case "stats":
        const stats = await getDashboardStats(schoolId);
        return NextResponse.json(stats);

      case "activity":
        const limit = parseInt(searchParams.get("limit") || "10");
        const activity = await getRecentActivity(schoolId, limit);
        return NextResponse.json(activity);

      case "enrollment_trends":
        const trends = await getEnrollmentTrends(schoolId);
        return NextResponse.json(trends);

      case "grade_distribution":
        const distribution = await getGradeDistribution(schoolId);
        return NextResponse.json(distribution);

      case "attendance_overview":
        const overview = await getAttendanceOverview(schoolId);
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
          getDashboardStats(schoolId),
          getRecentActivity(schoolId, 10),
          getEnrollmentTrends(schoolId),
          getGradeDistribution(schoolId),
          getAttendanceOverview(schoolId),
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
