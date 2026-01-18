import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentCourseGrades,
  getCourseGradeHistory,
} from "@/lib/dal/grades";

/**
 * GET /api/grades
 *
 * Fetch student course grades.
 *
 * Query parameters:
 * - periodId: Optional filter for specific grading period
 * - courseId: Optional filter for specific course (returns history)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get profile first (profiles table links auth_user_id to profile_id)
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get student ID from the database using profile_id
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get("periodId");
    const courseId = searchParams.get("courseId");

    // If courseId is provided, return grade history for that course
    if (courseId) {
      const history = await getCourseGradeHistory(student.id, courseId);
      return NextResponse.json({ grades: history });
    }

    // Otherwise, return grades for the period (or all periods if no filter)
    const grades = await getStudentCourseGrades(
      student.id,
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
