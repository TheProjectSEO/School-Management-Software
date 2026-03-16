import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/courses/[id]/sections - Get sections relevant to a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI("users:read");
    if (!auth.success) return auth.response;

    const { id: courseId } = await params;
    const supabase = createAdminClient();

    // Get the course to find its grade_level
    const { data: course } = await supabase
      .from("courses")
      .select("id, grade_level")
      .eq("id", courseId)
      .eq("school_id", auth.admin.schoolId)
      .maybeSingle();

    // Build sections query — all sections for this school
    let sectionsQuery = supabase
      .from("sections")
      .select("id, name, grade_level, capacity")
      .eq("school_id", auth.admin.schoolId)
      .order("grade_level")
      .order("name");

    // Filter by grade_level if the course has one
    if (course?.grade_level) {
      sectionsQuery = sectionsQuery.eq("grade_level", course.grade_level);
    }

    const { data: sections, error } = await sectionsQuery;

    if (error) {
      console.error("Error fetching sections:", error);
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    if (!sections || sections.length === 0) {
      return NextResponse.json([]);
    }

    // Get enrolled student counts per section for this course
    const sectionIds = sections.map(s => s.id);
    const { data: enrollmentCounts } = await supabase
      .from("enrollments")
      .select("section_id")
      .eq("course_id", courseId)
      .in("section_id", sectionIds)
      .eq("status", "active");

    const countMap: Record<string, number> = {};
    for (const e of enrollmentCounts || []) {
      countMap[e.section_id] = (countMap[e.section_id] || 0) + 1;
    }

    const sectionsWithCounts = sections.map(section => ({
      ...section,
      enrolled_count: countMap[section.id] || 0,
      capacity: section.capacity || 50,
    }));

    return NextResponse.json(sectionsWithCounts);
  } catch (error) {
    console.error("Error in GET /api/admin/courses/[id]/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
