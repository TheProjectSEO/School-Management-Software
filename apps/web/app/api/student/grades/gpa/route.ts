import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import {
  getCurrentGPA,
  getGPAHistory,
  getGPATrend,
} from "@/lib/dal/grades";

/**
 * GET /api/student/grades/gpa
 *
 * Fetch student GPA data.
 *
 * Query parameters:
 * - type: "current" | "history" | "trend" (defaults to "current")
 */
export async function GET(request: NextRequest) {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "current";

    switch (type) {
      case "history": {
        const history = await getGPAHistory(student.studentId);
        return NextResponse.json({ history });
      }
      case "trend": {
        const trend = await getGPATrend(student.studentId);
        return NextResponse.json({ trend });
      }
      case "current":
      default: {
        const gpa = await getCurrentGPA(student.studentId);
        return NextResponse.json({ gpa });
      }
    }
  } catch (error) {
    console.error("Error fetching GPA data:", error);
    return NextResponse.json(
      { error: "Failed to fetch GPA data" },
      { status: 500 }
    );
  }
}
