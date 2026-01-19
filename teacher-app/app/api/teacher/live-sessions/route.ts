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
  const sectionSubjectId = searchParams.get("sectionSubjectId");
  const status = searchParams.get("status");
  const upcoming = searchParams.get("upcoming") === "true";

  try {
    const supabase = await createClient();

    // Get teacher's section subjects
    const { data: teacherSectionSubjects } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_profile_id", teacherId);

    if (!teacherSectionSubjects || teacherSectionSubjects.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sectionSubjectIds = teacherSectionSubjects.map((ss) => ss.id);

    // Build query
    let query = supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        section_subject:teacher_assignments(
          id,
          section:sections(id, name),
          subject:courses(id, name, subject_code)
        ),
        module:modules(id, title)
      `
      )
      .in("section_subject_id", sectionSubjectIds)
      .order("start_at", { ascending: false });

    if (sectionSubjectId) {
      query = query.eq("section_subject_id", sectionSubjectId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (upcoming) {
      const now = new Date().toISOString();
      query = query.gte("start_at", now).eq("status", "scheduled");
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
      sectionSubjectId,
      moduleId,
      title,
      description,
      startAt,
      endAt,
      provider,
      joinUrl,
    } = body;

    // Validate required fields
    if (!sectionSubjectId || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Section subject ID, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Verify teacher teaches this section subject
    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("id", sectionSubjectId)
      .eq("teacher_profile_id", teacherId)
      .single();

    if (!sectionSubject) {
      return NextResponse.json(
        { error: "You do not have permission to create sessions for this section" },
        { status: 403 }
      );
    }

    // Validate times
    const start = new Date(startAt);
    const end = new Date(endAt);

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
        section_subject_id: sectionSubjectId,
        module_id: moduleId || null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        start_at: startAt,
        end_at: endAt,
        provider: provider || "external",
        join_url: joinUrl?.trim() || null,
        status: "scheduled",
      })
      .select(
        `
        *,
        section_subject:teacher_assignments(
          id,
          section:sections(id, name),
          subject:courses(id, name, subject_code)
        ),
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

    // TODO: Create notifications for enrolled students

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Live sessions POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
