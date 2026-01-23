/**
 * POST /api/teacher/messages/send
 * DEPRECATED: Use /api/messages/[studentProfileId] instead
 * This route exists for backwards compatibility
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, schoolId } = authResult.teacher;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { toProfileId, studentId, message, attachments } = body;

    // Validate required fields
    if ((!toProfileId && !studentId) || !message?.trim()) {
      return NextResponse.json(
        { error: "Recipient ID and message are required" },
        { status: 400 }
      );
    }

    // Get student_id if only profile ID was provided
    let targetStudentId = studentId;
    if (!targetStudentId && toProfileId) {
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", toProfileId)
        .single();

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }
      targetStudentId = student.id;
    }

    // Use the RPC function for teacher messages
    const { data, error } = await supabase.rpc('send_teacher_message', {
      p_teacher_id: teacherId,
      p_student_id: targetStudentId,
      p_school_id: schoolId,
      p_body: message.trim(),
      p_attachments: attachments || null,
    });

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message", details: error.message },
        { status: 500 }
      );
    }

    const result = data as { success: boolean; message_id?: string; error?: string };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: result.message_id
    }, { status: 201 });
  } catch (error) {
    console.error("Messages send error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
