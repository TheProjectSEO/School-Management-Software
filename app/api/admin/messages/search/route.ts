import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAPI } from "@/lib/dal/admin";

/**
 * GET /api/admin/messages/search
 * Search for students and teachers to start new conversations
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    const supabase = createServiceClient();
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

    // Search profiles by name in same school
    const { data: matchingProfiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", searchTerm)
      .limit(30);

    if (!matchingProfiles || matchingProfiles.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const profileIds = matchingProfiles.map((p) => p.id);
    const profileMap = new Map(matchingProfiles.map((p) => [p.id, p]));

    // Check which are teachers in same school
    const { data: teachers } = await supabase
      .from("teacher_profiles")
      .select("id, profile_id, department")
      .eq("school_id", admin.schoolId)
      .in("profile_id", profileIds);

    for (const t of teachers || []) {
      const profile = profileMap.get(t.profile_id);
      if (profile) {
        users.push({
          profile_id: t.profile_id,
          full_name: profile.full_name || "Unknown Teacher",
          email: "",
          avatar_url: profile.avatar_url || undefined,
          role: "teacher",
        });
      }
    }

    // Check which are students in same school
    const { data: students } = await supabase
      .from("students")
      .select("id, profile_id, grade_level, section_id")
      .eq("school_id", admin.schoolId)
      .in("profile_id", profileIds);

    // Get section names for students
    const sectionIds = [...new Set((students || []).map((s) => s.section_id).filter(Boolean))];
    let sectionMap = new Map<string, string>();
    if (sectionIds.length > 0) {
      const { data: sections } = await supabase
        .from("sections")
        .select("id, name")
        .in("id", sectionIds);

      sectionMap = new Map((sections || []).map((s) => [s.id, s.name]));
    }

    for (const s of students || []) {
      const profile = profileMap.get(s.profile_id);
      if (profile) {
        users.push({
          profile_id: s.profile_id,
          full_name: profile.full_name || "Unknown Student",
          email: "",
          avatar_url: profile.avatar_url || undefined,
          role: "student",
          grade_level: s.grade_level || undefined,
          section_name: s.section_id ? sectionMap.get(s.section_id) || undefined : undefined,
        });
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
