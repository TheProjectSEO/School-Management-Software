import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/courses/[id]/sections - Get sections for a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: courseId } = await params;
    const supabase = await createClient();

    // Get sections with enrolled student count
    const { data: sections, error } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        grade_level,
        capacity,
        school_year
      `)
      .eq("course_id", courseId)
      .order("name");

    if (error) {
      console.error("Error fetching sections:", error);
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    // Get enrollment counts for each section
    const sectionsWithCounts = await Promise.all(
      (sections || []).map(async (section) => {
        const { count } = await supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("section_id", section.id)
          .eq("status", "active");

        return {
          ...section,
          enrolled_count: count || 0,
        };
      })
    );

    return NextResponse.json(sectionsWithCounts);
  } catch (error) {
    console.error("Error in GET /api/admin/courses/[id]/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
