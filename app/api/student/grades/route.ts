import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import {
  getStudentCourseGrades,
  getCourseGradeHistory,
} from "@/lib/dal/grades";
import { studentHasCourseAccess } from "@/lib/dal/student";

/**
 * GET /api/student/grades
 *
 * Fetch student course grades.
 *
 * Query parameters:
 * - periodId: Optional filter for specific grading period
 * - courseId: Optional filter for specific course (returns history)
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
    const periodId = searchParams.get("periodId");
    const courseId = searchParams.get("courseId");

    // If courseId is provided, verify enrollment before returning grade history
    if (courseId) {
      const hasAccess = await studentHasCourseAccess(student.studentId, courseId);
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      const history = await getCourseGradeHistory(student.studentId, courseId);
      return NextResponse.json({ grades: history });
    }

    // Otherwise, return grades for the period (or all periods if no filter)
    const grades = await getStudentCourseGrades(
      student.studentId,
      periodId || undefined
    );

    return NextResponse.json({ grades });
  } catch (error) {
    console.error("Error fetching grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    );
  }
}
