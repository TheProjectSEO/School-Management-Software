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
    const onlyWithoutAdviser = searchParams.get("onlyWithoutAdviser") === "true";

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

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    const sectionIds = data.map(s => s.id);

    // Batch query: Get student counts for all sections at once
    const { data: studentCounts } = await supabase
      .from("students")
      .select("section_id")
      .in("section_id", sectionIds);

    // Build a map of section_id -> count
    const countMap = new Map<string, number>();
    (studentCounts || []).forEach(s => {
      const current = countMap.get(s.section_id) || 0;
      countMap.set(s.section_id, current + 1);
    });

    // Batch query: Get all advisers for these sections at once
    const { data: advisers } = await supabase
      .from("section_advisers")
      .select("section_id")
      .in("section_id", sectionIds);

    // Build a set of section IDs that have advisers
    const adviserSet = new Set((advisers || []).map(a => a.section_id));

    // Combine the data
    const sectionsWithCounts = data.map(section => ({
      ...section,
      enrolled_count: countMap.get(section.id) || 0,
      has_adviser: adviserSet.has(section.id),
    }));

    // Filter to only sections without adviser if requested
    const filteredSections = onlyWithoutAdviser
      ? sectionsWithCounts.filter((s) => !s.has_adviser)
      : sectionsWithCounts;

    return NextResponse.json(filteredSections);
  } catch (error) {
    console.error("Error in GET /api/admin/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
