import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentGPA,
  getGPAHistory,
  getGPATrend,
} from "@/lib/dal/grades";

/**
 * GET /api/grades/gpa
 *
 * Fetch student GPA data.
 *
 * Query parameters:
 * - type: "current" | "history" | "trend" (defaults to "current")
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
    const type = searchParams.get("type") || "current";

    switch (type) {
      case "history": {
        const history = await getGPAHistory(student.id);
        return NextResponse.json({ history });
      }
      case "trend": {
        const trend = await getGPATrend(student.id);
        return NextResponse.json({ trend });
      }
      case "current":
      default: {
        const gpa = await getCurrentGPA(student.id);
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
