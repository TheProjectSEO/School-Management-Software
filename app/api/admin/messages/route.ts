import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminAPI } from "@/lib/dal/admin";

/**
 * POST /api/admin/messages
 * Send a message from admin to a user (student or teacher)
 * Inserts directly into teacher_direct_messages table with sender_type='admin'
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI();
    if (!auth.success) return auth.response;
    const admin = auth.admin;

    const supabase = createServiceClient();

    const body = await request.json();
    const { recipientProfileId, message, subject } = body;

    // Validate required fields
    if (!recipientProfileId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: recipientProfileId and message are required" },
        { status: 400 }
      );
    }

    // Verify recipient exists in same school
    const { data: recipientProfile } = await supabase
      .from("school_profiles")
      .select("id, full_name")
      .eq("id", recipientProfileId)
      .maybeSingle();

    if (!recipientProfile) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Insert message into teacher_direct_messages with sender_type='admin'
    const { data: newMessage, error } = await supabase
      .from("teacher_direct_messages")
      .insert({
        school_id: admin.schoolId,
        from_profile_id: admin.profileId,
        to_profile_id: recipientProfileId,
        body: message.trim(),
        sender_type: "admin",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message_id: newMessage.id,
        message: {
          id: newMessage.id,
          subject: subject || "Direct Message",
          body: message.trim(),
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
