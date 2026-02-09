import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/subjects
 * Returns the list of section-subject assignments the current teacher can teach.
 * Shape matches live-sessions API expectations:
 *   id (section_subject_id), section { id, name }, subject { id, name, code }
 */
export async function GET(_req: NextRequest) {
  // Ensure authenticated teacher
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }
  const teacher = authResult.teacher;

  try {
    const supabase = createServiceClient();

    // Fetch assignments (flat columns only — avoids FK join issues)
    const { data: assignments, error } = await supabase
      .from("teacher_assignments")
      .select("id, section_id, course_id")
      .eq("teacher_profile_id", teacher.teacherId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching teacher assignments:", error);
      return NextResponse.json(
        { error: "Failed to fetch teacher subjects" },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ subjects: [] });
    }

    // Collect unique IDs
    const courseIds = [...new Set(assignments.map(a => a.course_id).filter(Boolean))] as string[];
    const sectionIds = [...new Set(assignments.map(a => a.section_id).filter(Boolean))] as string[];

    // Fetch courses and sections in parallel
    const [coursesResult, sectionsResult] = await Promise.all([
      courseIds.length > 0
        ? supabase.from("courses").select("id, name, subject_code").in("id", courseIds)
        : Promise.resolve({ data: [] as { id: string; name: string; subject_code: string }[], error: null }),
      sectionIds.length > 0
        ? supabase.from("sections").select("id, name, grade_level").in("id", sectionIds)
        : Promise.resolve({ data: [] as { id: string; name: string; grade_level: string }[], error: null }),
    ]);

    const coursesMap = new Map((coursesResult.data ?? []).map(c => [c.id, c]));
    const sectionsMap = new Map((sectionsResult.data ?? []).map(s => [s.id, s]));

    // Assemble response matching the expected shape
    const subjects = assignments.map(a => ({
      id: a.id,
      section: a.section_id ? (sectionsMap.get(a.section_id) ?? null) : null,
      subject: a.course_id ? (coursesMap.get(a.course_id) ?? null) : null,
    }));

    return NextResponse.json({ subjects });
  } catch (err) {
    console.error("GET /api/teacher/subjects error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

