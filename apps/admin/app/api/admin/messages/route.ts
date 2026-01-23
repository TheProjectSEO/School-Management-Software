import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/messages
 * Send a message from admin to a user (student or teacher)
 * Uses SECURITY DEFINER RPC to bypass RLS circular dependencies
 *
 * Accepts: { recipientProfileId, message, subject?, attachments?, parentMessageId? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const {
      recipientProfileId,
      message,
      subject,
      attachments,
      parentMessageId,
    } = body;

    // Validate required fields
    if (!recipientProfileId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: recipientProfileId and message are required" },
        { status: 400 }
      );
    }

    // Use RPC function that bypasses RLS
    // The RPC verifies admin access and recipient belongs to same school
    const { data, error } = await supabase.rpc("admin_send_message", {
      recipient_profile_id: recipientProfileId,
      message_subject: subject || "Direct Message",
      message_body: message.trim(),
      recipient_type: null, // Auto-detect
      message_attachments: attachments || null,
      parent_msg_id: parentMessageId || null,
    });

    if (error) {
      console.error("Error sending message via RPC:", error);

      if (error.message?.includes("Access denied")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message?.includes("Recipient not found")) {
        return NextResponse.json(
          { error: "Recipient not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    const result = data[0];

    return NextResponse.json(
      {
        success: true,
        message_id: result.message_id,
        message: {
          id: result.message_id,
          subject: subject || "Direct Message",
          body: message.trim(),
          createdAt: result.created_at,
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
