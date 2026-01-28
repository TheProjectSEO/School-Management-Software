// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * PATCH /api/teacher/live-sessions/[id]
 * Update a live session
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
    const supabase = await createClient();
    const body = await request.json();

    // Verify access
    const { data: session } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        course_id
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
    const { count: accessCount } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", session.course_id);

    if (!accessCount) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const {
      title,
      description,
      scheduledStart,
      scheduledEnd,
      joinUrl,
      status,
      recordingUrl,
    } = body;

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title?.trim() || null;
    if (description !== undefined)
      updates.description = description?.trim() || null;
    if (scheduledStart !== undefined) updates.scheduled_start = scheduledStart;
    if (scheduledEnd !== undefined) updates.scheduled_end = scheduledEnd;
    if (joinUrl !== undefined) updates.join_url = joinUrl?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (recordingUrl !== undefined)
      updates.recording_url = recordingUrl?.trim() || null;

    // Validate times if both are being updated
    if (updates.scheduled_start && updates.scheduled_end) {
      const start = new Date(updates.scheduled_start);
      const end = new Date(updates.scheduled_end);

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
        course:courses(id, name, subject_code),
        section:sections(id, name),
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

    const mirrorUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) mirrorUpdates.title = updates.title;
    if (updates.description !== undefined) mirrorUpdates.description = updates.description;
    if (updates.scheduled_start !== undefined)
      mirrorUpdates.scheduled_start = updates.scheduled_start;
    if (updates.scheduled_end !== undefined)
      mirrorUpdates.scheduled_end = updates.scheduled_end;
    if (updates.join_url !== undefined) mirrorUpdates.daily_room_url = updates.join_url;
    if (updates.status !== undefined) mirrorUpdates.status = updates.status;
    if (updates.recording_url !== undefined)
      mirrorUpdates.recording_url = updates.recording_url;

    if (Object.keys(mirrorUpdates).length > 0) {
      const { error: mirrorError } = await supabase
        .from("live_sessions")
        .update(mirrorUpdates)
        .eq("id", id);
      if (mirrorError) {
        console.error("Error updating student live session:", mirrorError);
      }
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
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Verify access
    const { data: session } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        status,
        course_id
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
    const { count: accessCount } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", session.course_id);

    if (!accessCount) {
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

    const { error: mirrorError } = await supabase
      .from("live_sessions")
      .delete()
      .eq("id", id);

    if (mirrorError) {
      console.error("Error deleting student live session:", mirrorError);
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
