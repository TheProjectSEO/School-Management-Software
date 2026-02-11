import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/sections - List all sections with search, adviser name, course count
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

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const gradeLevel = searchParams.get("gradeLevel");

    let query = supabase
      .from("sections")
      .select("id, name, grade_level, capacity, school_id")
      .eq("school_id", admin.schoolId)
      .order("grade_level")
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sections:", error);
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    const sections = data || [];

    // Get enrolled count, adviser name, and course count for each section
    const enriched = await Promise.all(
      sections.map(async (section) => {
        // Enrolled student count
        const { count: enrolledCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("section_id", section.id);

        // Adviser name via section_advisers → teacher_profiles → school_profiles
        let adviserName: string | null = null;
        try {
          const { data: adviser } = await supabase
            .from("section_advisers")
            .select("teacher_profile_id")
            .eq("section_id", section.id)
            .maybeSingle();

          if (adviser?.teacher_profile_id) {
            const { data: teacherProfile } = await supabase
              .from("teacher_profiles")
              .select("profile_id")
              .eq("id", adviser.teacher_profile_id)
              .maybeSingle();

            if (teacherProfile?.profile_id) {
              const { data: schoolProfile } = await supabase
                .from("school_profiles")
                .select("full_name")
                .eq("id", teacherProfile.profile_id)
                .maybeSingle();

              adviserName = schoolProfile?.full_name || null;
            }
          }
        } catch {
          // section_advisers table may not exist
        }

        // Course count from teacher_assignments for this section
        const { count: courseCount } = await supabase
          .from("teacher_assignments")
          .select("*", { count: "exact", head: true })
          .eq("section_id", section.id);

        return {
          ...section,
          enrolled_count: enrolledCount || 0,
          adviser_name: adviserName,
          course_count: courseCount || 0,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error in GET /api/admin/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await hasPermission("users:create");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, grade_level, capacity } = body;

    if (!name || !grade_level) {
      return NextResponse.json(
        { error: "Name and grade level are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check for duplicate name + grade_level in same school
    const { data: existing } = await supabase
      .from("sections")
      .select("id")
      .eq("school_id", admin.schoolId)
      .eq("name", name)
      .eq("grade_level", grade_level)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A section with this name and grade level already exists" },
        { status: 409 }
      );
    }

    const { data: newSection, error: insertError } = await supabase
      .from("sections")
      .insert({
        name,
        grade_level,
        capacity: capacity ? parseInt(capacity) : null,
        school_id: admin.schoolId,
      })
      .select("id, name, grade_level, capacity, school_id")
      .single();

    if (insertError) {
      console.error("Error creating section:", insertError);
      return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
    }

    return NextResponse.json(newSection, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/sections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
