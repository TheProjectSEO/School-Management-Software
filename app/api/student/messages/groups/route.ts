import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * GET /api/student/messages/groups
 * Get all section group chats for the student
 */
export async function GET() {
  const authResult = await requireStudentAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { profileId } = authResult.student;

  try {
    const supabase = createServiceClient();

    const { data: groupChats, error } = await supabase.rpc("get_user_group_chats", {
      p_profile_id: profileId,
    });

    if (error) {
      console.error("Error fetching group chats:", error);
      return NextResponse.json({ error: "Failed to fetch group chats" }, { status: 500 });
    }

    return NextResponse.json({ groupChats: groupChats || [] });
  } catch (error) {
    console.error("Error in GET /api/student/messages/groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
