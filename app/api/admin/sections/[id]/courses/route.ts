import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/sections/[id]/courses - Assign course(s) + teacher to a section
// Supports single: { courseId, teacherProfileId }
// Supports bulk:   { assignments: [{ courseId, teacherProfileId }] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI("users:update");
    if (!auth.success) return auth.response;

    const { id: sectionId } = await params;
    const body = await request.json();

    // Normalize to array of assignments
    let assignments: { courseId: string; teacherProfileId: string }[];

    if (body.assignments && Array.isArray(body.assignments)) {
      assignments = body.assignments;
    } else if (body.courseId && body.teacherProfileId) {
      assignments = [{ courseId: body.courseId, teacherProfileId: body.teacherProfileId }];
    } else {
      return NextResponse.json(
        { error: "courseId and teacherProfileId are required (or assignments array)" },
        { status: 400 }
      );
    }

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: "At least one assignment is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get existing assignments for this section to skip duplicates
    const courseIds = assignments.map((a) => a.courseId);
    const { data: existingAssignments } = await supabase
      .from("teacher_assignments")
      .select("course_id")
      .eq("section_id", sectionId)
      .in("course_id", courseIds);

    const existingCourseIds = new Set(
      (existingAssignments || []).map((a) => a.course_id)
    );

    // Filter out already-assigned courses
    const toInsert = assignments
      .filter((a) => !existingCourseIds.has(a.courseId))
      .map((a) => ({
        teacher_profile_id: a.teacherProfileId,
        course_id: a.courseId,
        section_id: sectionId,
      }));

    const skipped = assignments.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped,
        message: "All selected subjects are already assigned to this section.",
      });
    }

    // Bulk insert
    const { error } = await supabase
      .from("teacher_assignments")
      .insert(toInsert);

    if (error) {
      console.error("Error creating assignments:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-sync section group chat
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

    return NextResponse.json({
      success: true,
      created: toInsert.length,
      skipped,
      message: `${toInsert.length} subject${toInsert.length !== 1 ? "s" : ""} assigned${skipped > 0 ? `. ${skipped} already assigned.` : "."}`,
    }, { status: 201 });
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
    const auth = await requireAdminAPI("users:update");
    if (!auth.success) return auth.response;

    await params;

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
