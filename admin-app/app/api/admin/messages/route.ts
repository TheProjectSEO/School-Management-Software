import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/messages
 * Send a message from admin to a user (student or teacher)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      recipientId,
      recipientType,
      subject,
      message,
      attachments,
      parentMessageId,
    } = body;

    // Validate required fields
    if (!recipientId || !recipientType || !subject || !message) {
      return NextResponse.json(
        {
          error: "Missing required fields: recipientId, recipientType, subject, message",
        },
        { status: 400 }
      );
    }

    // Validate recipient type
    if (!["student", "teacher"].includes(recipientType)) {
      return NextResponse.json(
        { error: "Invalid recipientType. Must be 'student' or 'teacher'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify recipient exists and belongs to the same school
    if (recipientType === "student") {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, school_id")
        .eq("id", recipientId)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      if (student.school_id !== admin.school_id) {
        return NextResponse.json(
          { error: "Cannot send message to student from different school" },
          { status: 403 }
        );
      }
    } else {
      // TODO: Verify teacher when teacher system is integrated
      // For now, we'll assume the teacher exists
    }

    // Validate parent message if provided
    if (parentMessageId) {
      const { data: parentMessage, error: parentError } = await supabase
        .from("direct_messages")
        .select("id, school_id")
        .eq("id", parentMessageId)
        .single();

      if (parentError || !parentMessage) {
        return NextResponse.json(
          { error: "Parent message not found" },
          { status: 404 }
        );
      }

      if (parentMessage.school_id !== admin.school_id) {
        return NextResponse.json(
          { error: "Invalid parent message" },
          { status: 403 }
        );
      }
    }

    // Create the message
    const messageData: Record<string, unknown> = {
      school_id: admin.school_id,
      admin_id: admin.id,
      subject: subject.trim(),
      body: message.trim(),
      attachments_json: attachments || null,
      parent_message_id: parentMessageId || null,
      is_read: false,
    };

    // Set recipient based on type
    if (recipientType === "student") {
      messageData.to_student_id = recipientId;
      messageData.from_student_id = null;
      messageData.to_teacher_id = null;
      messageData.from_teacher_id = null;
    } else {
      messageData.to_teacher_id = recipientId;
      messageData.from_teacher_id = null;
      messageData.to_student_id = null;
      messageData.from_student_id = null;
    }

    const { data: newMessage, error: insertError } = await supabase
      .from("direct_messages")
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating message:", insertError);

      // Check for constraint violations
      if (insertError.code === "23514") {
        return NextResponse.json(
          { error: "Invalid message data. Please check all required fields." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: {
          id: newMessage.id,
          subject: newMessage.subject,
          body: newMessage.body,
          createdAt: newMessage.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
