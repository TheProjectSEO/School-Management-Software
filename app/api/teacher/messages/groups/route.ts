import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/messages/groups
 * Get all section group chats for the teacher
 */
export async function GET() {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { profileId } = authResult.teacher;

  try {
    const supabase = createServiceClient();

    // Get user's group chats using the RPC function
    const { data: groupChats, error } = await supabase.rpc("get_user_group_chats", {
      p_profile_id: profileId,
    });

    if (error) {
      console.error("Error fetching group chats:", error);
      // If RPC doesn't exist, return empty array gracefully
      if (error.code === "42883" || error.message?.includes("does not exist")) {
        return NextResponse.json({ groupChats: [] });
      }
      return NextResponse.json({ error: "Failed to fetch group chats" }, { status: 500 });
    }

    return NextResponse.json({ groupChats: groupChats || [] });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages/groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/teacher/messages/groups
 * Sync/create group chats for all teacher's assigned sections
 */
export async function POST() {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, schoolId } = authResult.teacher;

  try {
    const supabase = createServiceClient();

    // Get teacher's assigned sections
    const { data: assignments, error: assignError } = await supabase
      .from("teacher_assignments")
      .select("section_id")
      .eq("teacher_profile_id", teacherId);

    if (assignError) {
      console.error("Error fetching assignments:", assignError);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    const sectionIds = [...new Set((assignments || []).map((a) => a.section_id).filter(Boolean))];

    if (sectionIds.length === 0) {
      return NextResponse.json({ message: "No sections assigned", created: 0 });
    }

    // Create/update group chats for each section
    let created = 0;
    for (const sectionId of sectionIds) {
      const { error: createError } = await supabase.rpc("create_or_update_section_group_chat", {
        p_section_id: sectionId,
        p_school_id: schoolId,
      });

      if (createError) {
        console.error(`Error creating group chat for section ${sectionId}:`, createError);
      } else {
        created++;
      }
    }

    return NextResponse.json({ message: "Group chats synced", created });
  } catch (error) {
    console.error("Error in POST /api/teacher/messages/groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
