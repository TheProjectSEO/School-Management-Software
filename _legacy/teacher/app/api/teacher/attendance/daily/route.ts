// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/attendance/daily
 * Get daily attendance for a section
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const supabase = await createClient();

    // Validate section access
    if (!sectionId) {
      return NextResponse.json(
        { error: "Section ID is required" },
        { status: 400 }
      );
    }

    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("section_id", sectionId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
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
      .eq("section_id", sectionId)
      .eq("status", "active");

    if (!enrollments) {
      return NextResponse.json({ attendance: [] });
    }

    // Get attendance records for the date
    const { data: attendanceRecords } = await supabase
      .from("teacher_daily_attendance")
      .select("*")
      .eq("date", date)
      .in(
        "student_id",
        enrollments.map((e) => e.student_id)
      );

    // Combine enrollment and attendance data
    const attendance = enrollments.map((enrollment) => {
      const record = attendanceRecords?.find(
        (a) => a.student_id === enrollment.student_id
      );

      return {
        student: enrollment.student,
        attendance: record || {
          student_id: enrollment.student_id,
          date,
          status: "absent",
          first_seen_at: null,
          last_seen_at: null,
          detected_from_login: false,
          manual_override: false,
        },
      };
    });

    return NextResponse.json({ attendance, date });
  } catch (error) {
    console.error("Daily attendance GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/attendance/daily
 * Mark or update daily attendance
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, userId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { sectionId, date, studentId, status, notes } = body;

    // Validate required fields
    if (!sectionId || !date || !studentId || !status) {
      return NextResponse.json(
        { error: "Section ID, date, student ID, and status are required" },
        { status: 400 }
      );
    }

    // Verify section access
    const { data: sectionSubject } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("section_id", sectionId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify student is enrolled in section
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("section_id", sectionId)
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
      .from("teacher_daily_attendance")
      .select("id")
      .eq("student_id", studentId)
      .eq("date", date)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("teacher_daily_attendance")
        .update({
          status,
          manual_override: true,
          notes: notes?.trim() || null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json(
          { error: "Failed to update attendance" },
          { status: 500 }
        );
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from("teacher_daily_attendance")
        .insert({
          student_id: studentId,
          date,
          status,
          manual_override: true,
          detected_from_login: false,
          notes: notes?.trim() || null,
          updated_by: userId,
        });

      if (error) {
        console.error("Error creating attendance:", error);
        return NextResponse.json(
          { error: "Failed to create attendance record" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Attendance updated successfully",
    });
  } catch (error) {
    console.error("Daily attendance POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
