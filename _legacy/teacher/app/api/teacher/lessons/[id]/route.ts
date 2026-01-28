// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * PATCH /api/teacher/lessons/[id]
 * Update a lesson
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();
    const body = await request.json();

    // Verify access
    const { data: lesson } = await supabase
      .from("lessons")
      .select(
        `
        *,
        module:modules(subject_id)
      `
      )
      .eq("id", id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("subject_id", lesson.module.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
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
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Verify access
    const { data: lesson } = await supabase
      .from("lessons")
      .select(
        `
        *,
        module:modules(subject_id)
      `
      )
      .eq("id", id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("subject_id", lesson.module.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
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
