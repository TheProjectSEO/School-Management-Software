// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Get teacher's course assignments
    const { data: teacherAssignments } = await supabase
      .from("teacher_assignments")
      .select("id, course_id, section_id")
      .eq("teacher_profile_id", teacherId);

    if (!teacherAssignments || teacherAssignments.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const courseIds = teacherAssignments.map((assignment) => assignment.course_id);

    // Build query
    let query = supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        course:courses(id, name, subject_code),
        section:sections(id, name),
        module:modules(id, title)
      `
      )
      .in("course_id", courseIds)
      .order("scheduled_start", { ascending: false });

    if (assignmentId) {
      const matched = teacherAssignments.find((assignment) => assignment.id === assignmentId);
      if (matched) {
        query = query.eq("course_id", matched.course_id).eq("section_id", matched.section_id);
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

    return NextResponse.json({ sessions });
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

    // Create session
    const { data: session, error } = await supabase
      .from("teacher_live_sessions")
      .insert({
        course_id: assignment.course_id,
        section_id: assignment.section_id,
        module_id: moduleId || null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        scheduled_start: startAt,
        scheduled_end: endAt || end.toISOString(),
        provider: provider || "daily",
        join_url: joinUrl?.trim() || null,
        status: "scheduled",
        created_by: authResult.teacher.profileId,
      })
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
      console.error("Error creating live session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Mirror into student live_sessions table for discovery/join
    const { error: mirrorError } = await supabase
      .from("live_sessions")
      .upsert(
        {
          id: session.id,
          course_id: assignment.course_id,
          module_id: moduleId || null,
          teacher_profile_id: authResult.teacher.teacherId,
          title: title?.trim() || "Live Session",
          description: description?.trim() || null,
          scheduled_start: startAt,
          scheduled_end: endAt || end.toISOString(),
          status: "scheduled",
          recording_enabled: true,
          max_participants: 50,
        },
        { onConflict: "id" }
      );

    if (mirrorError) {
      console.error("Error mirroring live session:", mirrorError);
      await supabase.from("teacher_live_sessions").delete().eq("id", session.id);
      return NextResponse.json(
        { error: "Failed to create live session for students" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Live sessions POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
