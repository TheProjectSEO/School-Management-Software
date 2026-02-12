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

    // Search students in those sections (flat select — no FK joins per CLAUDE.md)
    const { data: students, error } = await supabase
      .from("students")
      .select("id, profile_id, grade_level, section_id")
      .eq("school_id", schoolId)
      .in("section_id", sectionIds);

    if (error) {
      console.error("Error searching students:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Get profiles separately and filter by search term
    const profileIds = students.map((s) => s.profile_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds)
      .ilike("full_name", searchTerm);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Get section names separately
    const uniqueSectionIds = [...new Set(students.map((s) => s.section_id).filter(Boolean))];
    let sectionMap = new Map<string, string>();
    if (uniqueSectionIds.length > 0) {
      const { data: sections } = await supabase
        .from("sections")
        .select("id, name")
        .in("id", uniqueSectionIds);
      sectionMap = new Map((sections || []).map((s) => [s.id, s.name]));
    }

    // Build results — only include students whose profile matched the search
    const results = students
      .filter((s) => profileMap.has(s.profile_id))
      .map((s) => {
        const profile = profileMap.get(s.profile_id)!;
        return {
          id: s.id,
          profile_id: s.profile_id,
          full_name: profile.full_name || "Unknown Student",
          avatar_url: profile.avatar_url,
          section_name: s.section_id ? sectionMap.get(s.section_id) : undefined,
          grade_level: s.grade_level,
        };
      })
      .slice(0, 20);

    // Sort by name
    results.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ students: results });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
