// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/attendance/session/[id]
 * Get attendance for a live session
 */
export async function GET(
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

    // Get session with access check
    const { data: session, error: sessionError } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        section_subject:teacher_assignments(
          id,
          teacher_id,
          section_id,
          section:sections(id, name),
          subject:courses(id, name, code)
        )
      `
      )
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (session.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `
        student_id,
        student:students(
          id,
          student_number,
          profile:school_profiles(
            first_name,
            last_name,
            avatar_url
          )
        )
      `
      )
      .eq("section_id", session.section_subject.section_id)
      .eq("status", "active");

    if (!enrollments) {
      return NextResponse.json({ session, attendance: [] });
    }

    // Get attendance records for this session
    const { data: attendanceRecords } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("session_id", id);

    // Get presence events for analytics
    const { data: presenceEvents } = await supabase
      .from("teacher_session_presence")
      .select("*")
      .eq("session_id", id);

    // Combine data
    const attendance = enrollments.map((enrollment) => {
      const record = attendanceRecords?.find(
        (a) => a.student_id === enrollment.student_id
      );
      const events = presenceEvents?.filter(
        (e) => e.student_id === enrollment.student_id
      );

      return {
        student: enrollment.student,
        attendance: record || {
          student_id: enrollment.student_id,
          session_id: id,
          status: "absent",
          detected_from_presence: false,
          manual_override: false,
        },
        presenceEvents: events || [],
      };
    });

    return NextResponse.json({ session, attendance });
  } catch (error) {
    console.error("Session attendance GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teacher/attendance/session/[id]
 * Update session attendance (manual override)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, userId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { studentId, status, notes } = body;

    // Validate required fields
    if (!studentId || !status) {
      return NextResponse.json(
        { error: "Student ID and status are required" },
        { status: 400 }
      );
    }

    // Get session with access check
    const { data: session } = await supabase
      .from("teacher_live_sessions")
      .select(
        `
        *,
        section_subject:teacher_assignments(
          teacher_id,
          section_id
        )
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

    // Verify access
    if (session.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify student is enrolled
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("section_id", session.section_subject.section_id)
      .eq("student_id", studentId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Student not enrolled in this section" },
        { status: 400 }
      );
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from("teacher_attendance")
      .select("id")
      .eq("session_id", id)
      .eq("student_id", studentId)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("teacher_attendance")
        .update({
          status,
          manual_override: true,
          notes: notes?.trim() || null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating session attendance:", error);
        return NextResponse.json(
          { error: "Failed to update attendance" },
          { status: 500 }
        );
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from("teacher_attendance")
        .insert({
          session_id: id,
          student_id: studentId,
          status,
          detected_from_presence: false,
          manual_override: true,
          notes: notes?.trim() || null,
          updated_by: userId,
        });

      if (error) {
        console.error("Error creating session attendance:", error);
        return NextResponse.json(
          { error: "Failed to create attendance record" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Session attendance updated successfully",
    });
  } catch (error) {
    console.error("Session attendance PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
