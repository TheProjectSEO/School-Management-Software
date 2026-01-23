import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface TeacherContext {
  userId: string;
  profileId: string;
  teacherId: string;
  schoolId: string;
}

/**
 * Validates teacher authentication and returns teacher context.
 * Returns NextResponse with error if authentication fails.
 */
export async function requireTeacher(): Promise<
  | { success: true; context: TeacherContext }
  | { success: false; response: NextResponse }
> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        ),
      };
    }

    // Get teacher record
    const { data: teacher, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("id, school_id")
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (teacherError || !teacher) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      context: {
        userId: user.id,
        profileId: profile.id,
        teacherId: teacher.id,
        schoolId: teacher.school_id,
      },
    };
  } catch (error) {
    console.error("requireTeacher error:", error);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}
