import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAdmin } from "@/lib/dal/admin";

interface RouteParams {
  params: Promise<{
    profileId: string;
  }>;
}

/**
 * POST /api/admin/messages/[profileId]/read
 * Mark all messages from a specific user to admin as read
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId: senderProfileId } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("teacher_direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("to_profile_id", admin.profileId)
      .eq("from_profile_id", senderProfileId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
      return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/messages/[profileId]/read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
