import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/dal/admin";

/**
 * GET /api/admin/messages/search
 * Search for students and teachers to start new conversations
 * Uses admin client to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    const supabase = createAdminClient();
    const searchTerm = `%${query.trim()}%`;
    const users: {
      profile_id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
      role: "teacher" | "student";
      grade_level?: string;
      section_name?: string;
    }[] = [];

    // Search teachers in the same school
    const { data: teachers, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select(`
        id,
        profile_id,
        department,
        profile:school_profiles!inner (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("school_id", admin.schoolId)
      .ilike("profile.full_name", searchTerm)
      .limit(10);

    if (teacherError) {
      console.error("Teacher search error:", teacherError);
    } else if (teachers) {
      for (const t of teachers) {
        const profile = t.profile as any;
        if (profile) {
          users.push({
            profile_id: t.profile_id,
            full_name: profile.full_name || "Unknown Teacher",
            email: "",
            avatar_url: profile.avatar_url,
            role: "teacher",
          });
        }
      }
    }

    // Search students in the same school
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select(`
        id,
        profile_id,
        grade_level,
        section:sections (
          name
        ),
        profile:school_profiles!inner (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("school_id", admin.schoolId)
      .ilike("profile.full_name", searchTerm)
      .limit(10);

    if (studentError) {
      console.error("Student search error:", studentError);
    } else if (students) {
      for (const s of students) {
        const profile = s.profile as any;
        const section = s.section as any;
        if (profile) {
          users.push({
            profile_id: s.profile_id,
            full_name: profile.full_name || "Unknown Student",
            email: "",
            avatar_url: profile.avatar_url,
            role: "student",
            grade_level: s.grade_level || undefined,
            section_name: section?.name || undefined,
          });
        }
      }
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
