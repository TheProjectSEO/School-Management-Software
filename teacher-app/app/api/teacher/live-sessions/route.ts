import { NextRequest, NextResponse } from "next/server";
import { createClient, createN8nSchemaClient } from "@/lib/supabase/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/live-sessions
 * List live sessions for teacher
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");
  const courseId = searchParams.get("courseId");
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming") === "true";

  try {
    const supabase = await createClient();

    // Get teacher's course assignments (from public schema)
    const { data: teacherAssignments } = await supabase
      .from("teacher_assignments")
      .select("id, course_id, section_id")
      .eq("teacher_profile_id", teacherId);

    if (!teacherAssignments || teacherAssignments.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const courseIds = teacherAssignments.map((assignment) => assignment.course_id);

    // Query from public.live_sessions (primary table that has Daily.co URLs)
    let query = supabase
      .from("live_sessions")
      .select(
        `
        id,
        course_id,
        title,
        description,
        scheduled_start,
        scheduled_end,
        actual_start,
        actual_end,
        status,
        daily_room_name,
        daily_room_url,
        recording_enabled,
        recording_url,
        recording_size_bytes,
        recording_duration_seconds,
        max_participants,
        course:courses(id, name, subject_code)
      `
      )
      .in("course_id", courseIds)
      .order("scheduled_start", { ascending: false });

    if (assignmentId) {
      const matched = teacherAssignments.find((assignment) => assignment.id === assignmentId);
      if (matched) {
        query = query.eq("course_id", matched.course_id);
      }
    }

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (upcoming) {
      const now = new Date().toISOString();
      query = query.gte("scheduled_start", now).eq("status", "scheduled");
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Error fetching live sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Get transcript status for all sessions
    const sessionIds = (sessions || []).map((s: any) => s.id);
    let transcriptMap: Record<string, boolean> = {};

    if (sessionIds.length > 0) {
      const { data: transcripts } = await supabase
        .from("session_transcripts")
        .select("session_id")
        .in("session_id", sessionIds);

      if (transcripts) {
        transcripts.forEach((t: any) => {
          transcriptMap[t.session_id] = true;
        });
      }
    }

    // Transform to match expected UI format (map daily_room_url to join_url)
    const transformedSessions = (sessions || []).map((session: any) => ({
      ...session,
      join_url: session.daily_room_url, // UI expects join_url
      has_transcript: transcriptMap[session.id] || false,
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error) {
    console.error("Live sessions GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/live-sessions
 * Create a new live session
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;

  try {
    const supabase = await createClient();
    const n8nSupabase = await createN8nSchemaClient();
    const body = await request.json();

    const {
      assignmentId,
      moduleId,
      title,
      description,
      startAt,
      endAt,
      provider,
      joinUrl,
    } = body;

    // Validate required fields
    if (!assignmentId || !startAt) {
      return NextResponse.json(
        { error: "Assignment, start time, and title are required" },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Verify teacher teaches this assignment and get course/section
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id, course_id, section_id")
      .eq("id", assignmentId)
      .eq("teacher_profile_id", teacherId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "You do not have permission to create sessions for this assignment" },
        { status: 403 }
      );
    }

    // Validate times
    const start = new Date(startAt);
    const end =
      endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Create session in public.live_sessions (primary table)
    const { data: session, error } = await supabase
      .from("live_sessions")
      .insert({
        course_id: assignment.course_id,
        module_id: moduleId || null,
        teacher_profile_id: teacherId,
        title: title?.trim() || "Live Session",
        description: description?.trim() || null,
        scheduled_start: startAt,
        scheduled_end: endAt || end.toISOString(),
        status: "scheduled",
        recording_enabled: true,
        max_participants: 50,
      })
      .select(
        `
        *,
        course:courses(id, name, subject_code)
      `
      )
      .single();

    if (error) {
      console.error("Error creating live session:", error);
      return NextResponse.json(
        { error: "Failed to create session", details: error.message },
        { status: 500 }
      );
    }

    // Sync to n8n_content_creation.teacher_live_sessions
    const { error: syncError } = await n8nSupabase
      .from("teacher_live_sessions")
      .upsert(
        {
          id: session.id,
          course_id: assignment.course_id,
          section_id: assignment.section_id,
          module_id: moduleId || null,
          title: title?.trim() || "Live Session",
          description: description?.trim() || null,
          scheduled_start: startAt,
          scheduled_end: endAt || end.toISOString(),
          provider: provider || "daily",
          join_url: joinUrl?.trim() || null,
          status: "scheduled",
          created_by: authResult.teacher.profileId,
        },
        { onConflict: "id" }
      );

    if (syncError) {
      console.error("Error syncing to teacher_live_sessions:", syncError);
      // Continue anyway - primary table is created
    }

    // Transform response to match UI expectations
    const transformedSession = {
      ...session,
      join_url: session.daily_room_url,
    };

    return NextResponse.json({ session: transformedSession }, { status: 201 });
  } catch (error) {
    console.error("Live sessions POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
