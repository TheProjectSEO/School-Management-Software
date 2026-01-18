// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * POST /api/teacher/messages/send
 * Send a direct message to a student or another teacher
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { userId, schoolId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { toUserId, message, attachments } = body;

    // Validate required fields
    if (!toUserId || !message?.trim()) {
      return NextResponse.json(
        { error: "Recipient user ID and message are required" },
        { status: 400 }
      );
    }

    // Verify recipient exists and is in the same school
    const { data: recipientProfile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", toUserId)
      .single();

    if (!recipientProfile) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Verify recipient is in same school (check via student or teacher profile)
    const { data: recipientStudent } = await supabase
      .from("students")
      .select("school_id")
      .eq("profile_id", recipientProfile.id)
      .single();

    const { data: recipientTeacher } = await supabase
      .from("teacher_profiles")
      .select("school_id")
      .eq("profile_id", recipientProfile.id)
      .single();

    const recipientSchoolId = recipientStudent?.school_id || recipientTeacher?.school_id;

    if (!recipientSchoolId || recipientSchoolId !== schoolId) {
      return NextResponse.json(
        { error: "Cannot send messages to users outside your school" },
        { status: 403 }
      );
    }

    // Create message
    const { data: directMessage, error } = await supabase
      .from("teacher_direct_messages")
      .insert({
        school_id: schoolId,
        from_user: userId,
        to_user: toUserId,
        body: message.trim(),
        attachments_json: attachments || [],
      })
      .select(
        `
        *,
        from_user_profile:profiles!from_user(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        to_user_profile:profiles!to_user(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // TODO: Create notification for recipient

    return NextResponse.json({ message: directMessage }, { status: 201 });
  } catch (error) {
    console.error("Messages send error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
