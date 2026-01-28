import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/messages/search
 * Search for students in teacher's assigned sections to start new conversations
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, schoolId } = authResult.teacher;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ students: [] });
  }

  try {
    const supabase = createServiceClient();
    const searchTerm = `%${query.trim()}%`;

    // Get teacher's assigned sections
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("section_id")
      .eq("teacher_profile_id", teacherId);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const sectionIds = [...new Set(assignments.map((a) => a.section_id).filter(Boolean))];

    if (sectionIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Search students in those sections
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        profile_id,
        grade_level,
        section:sections (
          id,
          name
        ),
        profile:school_profiles!inner (
          full_name,
          avatar_url
        )
      `)
      .eq("school_id", schoolId)
      .in("section_id", sectionIds)
      .ilike("profile.full_name", searchTerm)
      .limit(20);

    if (error) {
      console.error("Error searching students:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Transform results
    const results = (students || []).map((s) => {
      const profile = s.profile as unknown as { full_name: string; avatar_url?: string };
      const section = s.section as unknown as { id: string; name: string } | null;
      return {
        id: s.id,
        profile_id: s.profile_id,
        full_name: profile?.full_name || "Unknown Student",
        avatar_url: profile?.avatar_url,
        section_name: section?.name,
        grade_level: s.grade_level,
      };
    });

    // Sort by name
    results.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ students: results });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
