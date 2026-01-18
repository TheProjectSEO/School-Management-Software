// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * PATCH /api/teacher/live-sessions/[id]
 * Update a live session
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
    const { data: session } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        section_subject:teacher_assignments(teacher_id)
      `
      )
      .eq("id", id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    if (session.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const {
      title,
      description,
      startAt,
      endAt,
      joinUrl,
      status,
      recordingUrl,
    } = body;

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title?.trim() || null;
    if (description !== undefined)
      updates.description = description?.trim() || null;
    if (startAt !== undefined) updates.start_at = startAt;
    if (endAt !== undefined) updates.end_at = endAt;
    if (joinUrl !== undefined) updates.join_url = joinUrl?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (recordingUrl !== undefined)
      updates.recording_url = recordingUrl?.trim() || null;

    // Validate times if both are being updated
    if (updates.start_at && updates.end_at) {
      const start = new Date(updates.start_at);
      const end = new Date(updates.end_at);

      if (end <= start) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    // Update session
    const { data: updatedSession, error } = await supabase
      .from("teacher_live_sessions")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        section_subject:teacher_assignments(
          id,
          section:sections(id, name),
          subject:courses(id, name, code)
        ),
        module:modules(id, title)
      `
      )
      .single();

    if (error) {
      console.error("Error updating live session:", error);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Live session PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teacher/live-sessions/[id]
 * Delete a live session
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
    const { data: session } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        status,
        section_subject:teacher_assignments(teacher_id)
      `
      )
      .eq("id", id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    if (session.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Don't allow deletion of active or completed sessions with recordings
    if (session.status === "active" || session.status === "completed") {
      return NextResponse.json(
        { error: "Cannot delete active or completed sessions" },
        { status: 400 }
      );
    }

    // Delete session
    const { error } = await supabase
      .from("teacher_live_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting live session:", error);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Live session DELETE error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
