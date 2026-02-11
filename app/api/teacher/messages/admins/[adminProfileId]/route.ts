import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/messages/admins/[adminProfileId]
 * Get messages with a specific admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminProfileId: string }> }
) {
  try {
    const authResult = await requireTeacherAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { profileId, schoolId } = authResult.teacher;
    const { adminProfileId } = await params;
    const supabase = createServiceClient();

    // Validate admin exists in same school
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("profile_id", adminProfileId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Get messages between teacher and admin
    const { data: messages, error } = await supabase
      .from("teacher_direct_messages")
      .select("*")
      .or(
        `and(from_profile_id.eq.${profileId},to_profile_id.eq.${adminProfileId}),and(from_profile_id.eq.${adminProfileId},to_profile_id.eq.${profileId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching admin messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Enrich with profile data
    const profileIds = new Set<string>();
    for (const msg of messages || []) {
      profileIds.add(msg.from_profile_id);
      profileIds.add(msg.to_profile_id);
    }

    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", Array.from(profileIds));

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enrichedMessages = (messages || []).map((msg) => ({
      id: msg.id,
      sender_id: msg.from_profile_id,
      sender_name: profileMap.get(msg.from_profile_id)?.full_name || "Unknown",
      sender_role: msg.sender_type,
      content: msg.body,
      created_at: msg.created_at,
      is_read: msg.is_read,
      read_at: msg.read_at,
      delivered_at: msg.delivered_at,
    }));

    // Mark messages TO this teacher FROM admin as read
    await supabase
      .from("teacher_direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("to_profile_id", profileId)
      .eq("from_profile_id", adminProfileId)
      .eq("is_read", false);

    return NextResponse.json({ messages: enrichedMessages });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages/admins/[adminProfileId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/teacher/messages/admins/[adminProfileId]
 * Send a message to an admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ adminProfileId: string }> }
) {
  try {
    const authResult = await requireTeacherAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { profileId, schoolId } = authResult.teacher;
    const { adminProfileId } = await params;
    const supabase = createServiceClient();

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Validate admin exists in same school
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("profile_id", adminProfileId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from("teacher_direct_messages")
      .insert({
        school_id: schoolId,
        from_profile_id: profileId,
        to_profile_id: adminProfileId,
        body: content.trim(),
        sender_type: "teacher",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error sending message to admin:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message_id: newMessage.id,
      created_at: newMessage.created_at,
    });
  } catch (error) {
    console.error("Error in POST /api/teacher/messages/admins/[adminProfileId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
