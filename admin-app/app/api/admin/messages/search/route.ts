import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/messages/search
 * Search for students and teachers to start new conversations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("school_id")
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (!adminProfile) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 404 }
      );
    }

    const searchTerm = `%${query.trim()}%`;
    const users: Array<{
      profile_id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
      role: "teacher" | "student";
      grade_level?: string;
      section_name?: string;
    }> = [];

    // Search students
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(
        `
        id,
        profile_id,
        grade_level,
        profiles!inner (
          id,
          full_name,
          avatar_url
        ),
        sections (
          name
        )
      `
      )
      .ilike("profiles.full_name", searchTerm)
      .eq("status", "active")
      .limit(20);

    if (!studentsError && students) {
      students.forEach((student: any) => {
        if (student.profiles) {
          const profileData = Array.isArray(student.profiles)
            ? student.profiles[0]
            : student.profiles;
          const sectionData = Array.isArray(student.sections)
            ? student.sections[0]
            : student.sections;

          users.push({
            profile_id: student.profile_id,
            full_name: profileData?.full_name || "Unknown Student",
            email: "", // Email not needed in search results
            avatar_url: profileData?.avatar_url,
            role: "student",
            grade_level: student.grade_level,
            section_name: sectionData?.name,
          });
        }
      });
    }

    // Search teachers
    const { data: teachers, error: teachersError } = await supabase
      .from("teacher_profiles")
      .select(
        `
        id,
        profile_id,
        department,
        profiles!inner (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .ilike("profiles.full_name", searchTerm)
      .eq("is_active", true)
      .limit(20);

    if (!teachersError && teachers) {
      teachers.forEach((teacher: any) => {
        if (teacher.profiles) {
          const profileData = Array.isArray(teacher.profiles)
            ? teacher.profiles[0]
            : teacher.profiles;

          users.push({
            profile_id: teacher.profile_id,
            full_name: profileData?.full_name || "Unknown Teacher",
            email: "", // Email not needed in search results
            avatar_url: profileData?.avatar_url,
            role: "teacher",
          });
        }
      });
    }

    // Sort by name
    users.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
