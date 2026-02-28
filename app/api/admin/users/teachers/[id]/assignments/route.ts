import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/users/teachers/[id]/assignments - Get teacher's course assignments
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

    const { id: teacherId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("id, teacher_profile_id, course_id, section_id, is_primary")
      .eq("teacher_profile_id", teacherId);

    if (error) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    const rows = data || [];

    // Fetch courses and sections separately (BUG-001: no FK joins)
    const courseIds = [...new Set(rows.map((r) => r.course_id).filter(Boolean))];
    const sectionIds = [...new Set(rows.map((r) => r.section_id).filter(Boolean))];

    const [{ data: courses }, { data: sections }] = await Promise.all([
      courseIds.length > 0
        ? supabase.from("courses").select("id, name, subject_code").in("id", courseIds)
        : Promise.resolve({ data: [] }),
      sectionIds.length > 0
        ? supabase.from("sections").select("id, name, grade_level").in("id", sectionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const courseMap = new Map((courses || []).map((c) => [c.id, c]));
    const sectionMap = new Map((sections || []).map((s) => [s.id, s]));

    const assignments = rows.map((item) => ({
      id: item.id,
      teacher_profile_id: item.teacher_profile_id,
      course_id: item.course_id,
      section_id: item.section_id,
      is_primary: item.is_primary ?? true,
      course: courseMap.get(item.course_id) ?? null,
      section: sectionMap.get(item.section_id) ?? null,
    }));

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error in GET /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/teachers/[id]/assignments - Assign teacher to a course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const body = await request.json();
    const { courseId, sectionId, isPrimary = true } = body;

    if (!courseId || !sectionId) {
      return NextResponse.json(
        { error: "courseId and sectionId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", courseId)
      .eq("section_id", sectionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Teacher is already assigned to this course in this section" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teacher_assignments")
      .insert({
        teacher_profile_id: teacherId,
        course_id: courseId,
        section_id: sectionId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/teachers/[id]/assignments - Remove a course assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error deleting assignment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/teachers/[id]/assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
