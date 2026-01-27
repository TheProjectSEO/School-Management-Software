import { NextRequest, NextResponse } from "next/server";
import { createClient, createN8nSchemaClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
    const serviceClient = createServiceClient(); // Use service client to bypass RLS

    // Get teacher's course assignments (from public schema)
    console.log("[Live Sessions GET] Fetching assignments for teacher:", teacherId);
    const { data: teacherAssignments, error: assignmentsError } = await supabase
      .from("teacher_assignments")
      .select("id, course_id, section_id")
      .eq("teacher_profile_id", teacherId);

    if (assignmentsError) {
      console.error("[Live Sessions GET] Error fetching assignments:", assignmentsError);
      return NextResponse.json({ sessions: [], error: "Failed to fetch assignments" });
    }

    if (!teacherAssignments || teacherAssignments.length === 0) {
      console.log("[Live Sessions GET] No assignments found for teacher");
      return NextResponse.json({ sessions: [] });
    }

    console.log("[Live Sessions GET] Found assignments:", teacherAssignments.length);

    const courseIds = teacherAssignments.map((assignment) => assignment.course_id);

    // Query from public.live_sessions (primary table that has Daily.co URLs)
    // Use service client to bypass RLS (policy has wrong column name)
    let query = serviceClient
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
        course:courses(id, name, subject_code, section_id)
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

    console.log("[Live Sessions GET] Querying live_sessions for courses:", courseIds);
    const { data: sessions, error } = await query;

    if (error) {
      console.error("[Live Sessions GET] Error fetching live sessions:", error);
      // Return empty array instead of 500 to prevent page breaking
      return NextResponse.json({ sessions: [], error: error.message });
    }

    console.log("[Live Sessions GET] Found sessions:", sessions?.length || 0);

    // Get transcript status for all sessions (handle missing table gracefully)
    const sessionIds = (sessions || []).map((s: any) => s.id);
    let transcriptMap: Record<string, boolean> = {};

    if (sessionIds.length > 0) {
      try {
        const { data: transcripts } = await supabase
          .from("session_transcripts")
          .select("session_id")
          .in("session_id", sessionIds);

        if (transcripts) {
          transcripts.forEach((t: any) => {
            transcriptMap[t.session_id] = true;
          });
        }
      } catch (err) {
        // session_transcripts table might not exist yet - ignore
        console.warn("Could not fetch session transcripts:", err);
      }
    }

    // Get section info for courses that have section_id
    const sectionIds = [...new Set((sessions || [])
      .map((s: any) => s.course?.section_id)
      .filter(Boolean))];

    let sectionMap: Record<string, { id: string; name: string }> = {};
    if (sectionIds.length > 0) {
      const { data: sections } = await supabase
        .from("sections")
        .select("id, name")
        .in("id", sectionIds);

      if (sections) {
        sections.forEach((sec: any) => {
          sectionMap[sec.id] = { id: sec.id, name: sec.name };
        });
      }
    }

    // Transform to match expected UI format (map daily_room_url to join_url)
    const transformedSessions = (sessions || []).map((session: any) => ({
      ...session,
      join_url: session.daily_room_url, // UI expects join_url
      has_transcript: transcriptMap[session.id] || false,
      // Get section from our separate lookup
      section: session.course?.section_id ? sectionMap[session.course.section_id] || null : null,
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error) {
    console.error("[Live Sessions GET] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // Return empty sessions with error to prevent page breaking
    return NextResponse.json({ sessions: [], error: message });
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
    // Column is teacher_profile_id (NOT NULL constraint)
    console.log("[Live Sessions POST] Creating session for course:", assignment.course_id, "teacher:", teacherId);
    const serviceClient = createServiceClient();
    const { data: session, error } = await serviceClient
      .from("live_sessions")
      .insert({
        course_id: assignment.course_id,
        module_id: moduleId || null,
        teacher_profile_id: teacherId, // Required NOT NULL column
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
      console.error("[Live Sessions POST] Error creating live session:", error);
      console.error("[Live Sessions POST] Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to create session", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log("[Live Sessions POST] Session created:", session?.id);

    // Sync to n8n_content_creation.teacher_live_sessions (optional)
    try {
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
        console.error("[Live Sessions POST] Error syncing to teacher_live_sessions:", syncError);
        // Continue anyway - primary table is created
      }
    } catch (syncErr) {
      console.warn("[Live Sessions POST] Could not sync to n8n schema:", syncErr);
      // Continue - n8n schema sync is optional
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
