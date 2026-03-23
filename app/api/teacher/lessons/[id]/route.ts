// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * PATCH /api/teacher/lessons/[id]
 * Update a lesson
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Fetch lesson (flat select — no FK joins per BUG-001)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, module_id")
      .eq("id", id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Fetch module to get course_id (flat select)
    const { data: module } = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Verify teacher owns this course (IDOR fix: check course_id, not subject_id)
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("course_id", module.course_id)
      .eq("teacher_profile_id", teacherId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const { title, content, type, order, duration, videoUrl, attachments } =
      body;

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content?.trim() || null;
    if (type !== undefined) updates.type = type;
    if (order !== undefined) updates.order = order;
    if (duration !== undefined) updates.duration = duration;
    if (videoUrl !== undefined) updates.video_url = videoUrl?.trim() || null;
    if (attachments !== undefined) updates.attachments = attachments;

    // Update lesson
    const { data: updatedLesson, error } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        module:modules(
          id,
          title
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating lesson:", error);
      return NextResponse.json(
        { error: "Failed to update lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lesson: updatedLesson });
  } catch (error) {
    console.error("Lesson PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teacher/lessons/[id]
 * Delete a lesson
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Fetch lesson (flat select — no FK joins per BUG-001)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, module_id")
      .eq("id", id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Fetch module to get course_id (flat select)
    const { data: module } = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Verify teacher owns this course (IDOR fix: check course_id, not subject_id)
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("course_id", module.course_id)
      .eq("teacher_profile_id", teacherId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete lesson
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting lesson:", error);
      return NextResponse.json(
        { error: "Failed to delete lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lesson DELETE error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
