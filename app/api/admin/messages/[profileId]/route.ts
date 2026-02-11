import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAdmin } from "@/lib/dal/admin";

interface RouteParams {
  params: Promise<{
    profileId: string;
  }>;
}

/**
 * GET /api/admin/messages/[profileId]
 * Get message thread with a specific user (student or teacher)
 * Uses direct queries on teacher_direct_messages table
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId: targetProfileId } = await params;
    const supabase = createServiceClient();

    // Get messages between admin and target
    const { data: messages, error } = await supabase
      .from("teacher_direct_messages")
      .select("*")
      .or(
        `and(from_profile_id.eq.${admin.profileId},to_profile_id.eq.${targetProfileId}),and(from_profile_id.eq.${targetProfileId},to_profile_id.eq.${admin.profileId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Get profile info for both participants
    const profileIds = new Set<string>();
    profileIds.add(admin.profileId);
    profileIds.add(targetProfileId);
    for (const msg of messages || []) {
      profileIds.add(msg.from_profile_id);
      profileIds.add(msg.to_profile_id);
    }

    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", Array.from(profileIds));

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Determine target's role
    let targetRole: "student" | "teacher" | "unknown" = "unknown";
    const { data: teacherCheck } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("profile_id", targetProfileId)
      .maybeSingle();

    if (teacherCheck) {
      targetRole = "teacher";
    } else {
      const { data: studentCheck } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", targetProfileId)
        .maybeSingle();

      if (studentCheck) {
        targetRole = "student";
      }
    }

    const targetProfile = profileMap.get(targetProfileId);

    // Format messages
    const formattedMessages = (messages || []).map((msg) => ({
      id: msg.id,
      school_id: msg.school_id,
      from_profile_id: msg.from_profile_id,
      to_profile_id: msg.to_profile_id,
      body: msg.body,
      sender_type: msg.sender_type,
      is_read: msg.is_read,
      read_at: msg.read_at,
      delivered_at: msg.delivered_at,
      created_at: msg.created_at,
      fromName: profileMap.get(msg.from_profile_id)?.full_name || "Unknown",
      fromAdmin: msg.from_profile_id === admin.profileId,
    }));

    // Mark messages TO admin FROM target as read
    await supabase
      .from("teacher_direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("to_profile_id", admin.profileId)
      .eq("from_profile_id", targetProfileId)
      .eq("is_read", false);

    return NextResponse.json({
      messages: formattedMessages,
      participant: {
        name: targetProfile?.full_name || "Unknown",
        role: targetRole,
        id: targetProfileId,
      },
      total: formattedMessages.length,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/[profileId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
