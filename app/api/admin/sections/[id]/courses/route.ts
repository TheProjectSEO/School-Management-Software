import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/sections/[id]/courses - Assign a course + teacher to a section
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

    const { id: sectionId } = await params;
    const body = await request.json();
    const { courseId, teacherProfileId } = body;

    if (!courseId || !teacherProfileId) {
      return NextResponse.json(
        { error: "courseId and teacherProfileId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if this course is already assigned to this section
    const { data: existing } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("section_id", sectionId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This course is already assigned to this section" },
        { status: 409 }
      );
    }

    // Insert teacher_assignment
    const { data, error } = await supabase
      .from("teacher_assignments")
      .insert({
        teacher_profile_id: teacherProfileId,
        course_id: courseId,
        section_id: sectionId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-sync section group chat after teacher assignment
    const { data: section } = await supabase
      .from("sections")
      .select("school_id")
      .eq("id", sectionId)
      .single();

    if (section) {
      await supabase.rpc("create_or_update_section_group_chat", {
        p_section_id: sectionId,
        p_school_id: section.school_id,
      }).then(null, (err: unknown) => {
        console.error("Error syncing group chat after course assignment:", err);
      });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/sections/[id]/courses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sections/[id]/courses - Remove a course assignment from a section
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

    await params; // consume params

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
    console.error("Error in DELETE /api/admin/sections/[id]/courses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
