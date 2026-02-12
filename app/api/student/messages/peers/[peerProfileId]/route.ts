import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * GET /api/student/messages/peers/[peerProfileId]
 * Get messages with a peer student
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ peerProfileId: string }> }
) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { peerProfileId } = await params;
    const supabase = createServiceClient();

    // Validate peer is reachable (shared section or course)
    const isReachable = await validatePeerAccess(supabase, student.studentId, student.sectionId, peerProfileId);
    if (!isReachable) {
      return NextResponse.json({ error: "Cannot message this student" }, { status: 403 });
    }

    // Get messages between the two students
    const { data: messages, error } = await supabase
      .from("teacher_direct_messages")
      .select("*")
      .or(
        `and(from_profile_id.eq.${student.profileId},to_profile_id.eq.${peerProfileId}),and(from_profile_id.eq.${peerProfileId},to_profile_id.eq.${student.profileId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching peer messages:", error);
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
      ...msg,
      from_user: profileMap.get(msg.from_profile_id),
      to_user: profileMap.get(msg.to_profile_id),
    }));

    // Mark messages TO this student as read
    await supabase
      .from("teacher_direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("to_profile_id", student.profileId)
      .eq("from_profile_id", peerProfileId)
      .eq("is_read", false);

    return NextResponse.json({ messages: enrichedMessages });
  } catch (error) {
    console.error("Error in GET /api/student/messages/peers/[peerProfileId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/student/messages/peers/[peerProfileId]
 * Send a message to a peer student (no quota)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ peerProfileId: string }> }
) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { peerProfileId } = await params;
    const supabase = createServiceClient();

    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Validate peer is reachable
    const isReachable = await validatePeerAccess(supabase, student.studentId, student.sectionId, peerProfileId);
    if (!isReachable) {
      return NextResponse.json({ error: "Cannot message this student" }, { status: 403 });
    }

    // Insert message into teacher_direct_messages with sender_type = 'student'
    const { data: newMessage, error } = await supabase
      .from("teacher_direct_messages")
      .insert({
        school_id: student.schoolId,
        from_profile_id: student.profileId,
        to_profile_id: peerProfileId,
        body: message.trim(),
        sender_type: "student",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error sending peer message:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message_id: newMessage.id,
      created_at: newMessage.created_at,
    });
  } catch (error) {
    console.error("Error in POST /api/student/messages/peers/[peerProfileId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Validate that the current student can message the peer
 * (shared section or at least one shared course)
 */
async function validatePeerAccess(
  supabase: ReturnType<typeof createServiceClient>,
  studentId: string,
  sectionId: string | null,
  peerProfileId: string
): Promise<boolean> {
  // Get peer's student record
  const { data: peerStudent } = await supabase
    .from("students")
    .select("id, section_id")
    .eq("profile_id", peerProfileId)
    .maybeSingle();

  if (!peerStudent) return false;

  // Check shared section
  if (sectionId && peerStudent.section_id === sectionId) {
    return true;
  }

  // Check shared courses (enrollments OR section-based assignments)
  let myCourseIds: string[] = [];
  const { data: myEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  myCourseIds = (myEnrollments || []).map((e) => e.course_id);

  // Fallback: check section-based assignments
  if (myCourseIds.length === 0 && sectionId) {
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("course_id")
      .eq("section_id", sectionId);
    myCourseIds = [...new Set((assignments || []).map((a) => a.course_id))];
  }

  if (myCourseIds.length === 0) return false;

  // Check if peer shares any courses (via enrollment or section)
  const { data: sharedEnrollments } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", peerStudent.id)
    .in("course_id", myCourseIds)
    .limit(1);

  if ((sharedEnrollments || []).length > 0) return true;

  // Also check if peer is in a section that has the same courses assigned
  if (peerStudent.section_id) {
    const { data: peerAssignments } = await supabase
      .from("teacher_assignments")
      .select("course_id")
      .eq("section_id", peerStudent.section_id)
      .in("course_id", myCourseIds)
      .limit(1);

    if ((peerAssignments || []).length > 0) return true;
  }

  return false;
}
