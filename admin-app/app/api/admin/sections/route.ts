import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/sections - Get sections, optionally filtered by grade level
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const gradeLevel = searchParams.get("gradeLevel");

    let query = supabase
      .from("sections")
      .select("id, name, grade_level, capacity, school_id")
      .eq("school_id", admin.school_id) // Filter by admin's school
      .order("grade_level")
      .order("name");

    if (gradeLevel) {
      // Normalize grade level - extract just the number (handle "11", "Grade 11", "Grade 11-A", etc.)
      const normalizedGrade = gradeLevel.replace(/^Grade\s*/i, "").trim().split(/[\s-]/)[0];
      
      // Match sections where grade_level contains this number
      // This handles: "11", "Grade 11", "11-A", etc.
      query = query.or(`grade_level.eq.${normalizedGrade},grade_level.eq.Grade ${normalizedGrade},grade_level.ilike.%${normalizedGrade}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sections:", error);
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    // Get enrollment counts for each section
    const sectionsWithCounts = await Promise.all(
      (data || []).map(async (section) => {
        const { count } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("section_id", section.id);

        return {
          ...section,
          enrolled_count: count || 0,
        };
      })
    );

    return NextResponse.json(sectionsWithCounts);
  } catch (error) {
    console.error("Error in GET /api/admin/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
