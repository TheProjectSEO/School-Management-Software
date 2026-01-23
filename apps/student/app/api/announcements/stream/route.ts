/**
 * SSE (Server-Sent Events) endpoint for real-time announcement streaming
 * Students receive notifications when new announcements are published
 *
 * IMPORTANT: Uses service role client for realtime subscriptions
 * because the cookie-based server client doesn't support long-lived connections
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("[SSE Announcements] Request received");

  // Use regular client for auth check
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[SSE Announcements] Unauthorized:", authError?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  // Get student profile and enrollment info for filtering
  const { data: profile, error: profileError } = await supabase
    .from("school_profiles")
    .select("id, school_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.log("[SSE Announcements] Profile not found:", profileError?.message);
    return new Response("Profile not found", { status: 404 });
  }

  // Get student details for announcement targeting
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, section_id, grade_level")
    .eq("profile_id", profile.id)
    .single();

  if (studentError || !student) {
    console.log("[SSE Announcements] Student not found:", studentError?.message);
    return new Response("Student not found", { status: 404 });
  }

  // Get enrolled course IDs for course-targeted announcements
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", student.id);

  const enrolledCourseIds = enrollments?.map((e) => e.course_id) || [];

  const profileId = profile.id;
  const schoolId = profile.school_id;
  const sectionId = student.section_id;
  const gradeLevel = student.grade_level;

  console.log(`[SSE Announcements] Setting up stream for student: ${student.id}, school: ${schoolId}`);

  // Create service client for realtime subscriptions
  let realtimeClient;
  try {
    realtimeClient = createServiceClient();
  } catch (err) {
    console.error("[SSE Announcements] Failed to create service client:", err);
    return new Response("Service unavailable - check SUPABASE_SERVICE_ROLE_KEY", { status: 503 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let isConnectionClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (isConnectionClosed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error("[SSE Announcements] Error sending event:", err);
          isConnectionClosed = true;
        }
      };

      // Send heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (isConnectionClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendEvent("heartbeat", { timestamp: Date.now() });
      }, 15000);

      // Send connected event
      sendEvent("connected", { profileId, schoolId, timestamp: Date.now() });

      // Create Supabase realtime channel
      const channelName = `announcements:${profileId}:${Date.now()}`;

      console.log(`[SSE Announcements] Creating channel: ${channelName}`);

      const channel = realtimeClient
        .channel(channelName)
        // Listen for ALL changes to teacher_announcements
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teacher_announcements",
          },
          (payload) => {
            console.log(`[SSE Announcements] Received ${payload.eventType}:`, payload);

            const announcement = payload.new || payload.old;
            if (!announcement) return;

            // Filter: only process announcements for this school
            if (announcement.school_id !== schoolId) {
              return;
            }

            if (payload.eventType === "INSERT") {
              // Only notify for published announcements targeted to this student
              if (announcement.is_published && isAnnouncementTargetedToStudent(announcement, {
                sectionId,
                gradeLevel,
                enrolledCourseIds,
              })) {
                console.log(`[SSE Announcements] Sending new_announcement event`);
                sendEvent("new_announcement", announcement);
              }
            } else if (payload.eventType === "UPDATE") {
              const oldAnnouncement = payload.old;

              // Check if this is a publish event
              if (!oldAnnouncement?.is_published && announcement.is_published) {
                if (isAnnouncementTargetedToStudent(announcement, {
                  sectionId,
                  gradeLevel,
                  enrolledCourseIds,
                })) {
                  console.log(`[SSE Announcements] Announcement published, sending new_announcement`);
                  sendEvent("new_announcement", announcement);
                }
              } else if (announcement.is_published) {
                // Already published announcement was updated
                if (isAnnouncementTargetedToStudent(announcement, {
                  sectionId,
                  gradeLevel,
                  enrolledCourseIds,
                })) {
                  sendEvent("announcement_updated", announcement);
                }
              }
            } else if (payload.eventType === "DELETE") {
              sendEvent("announcement_deleted", { id: announcement.id });
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[SSE Announcements] Subscription status: ${status}`, err || '');

          if (status === "SUBSCRIBED") {
            sendEvent("subscribed", { channel: channelName, status: "ready" });
          } else if (status === "CHANNEL_ERROR") {
            sendEvent("error", { message: "Channel error", status, error: String(err) });
          }
        });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`[SSE Announcements] Client disconnected, cleaning up`);
        isConnectionClosed = true;
        clearInterval(heartbeatInterval);
        realtimeClient.removeChannel(channel);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Check if an announcement is targeted to a specific student
 */
function isAnnouncementTargetedToStudent(
  announcement: {
    target_type: string;
    target_section_ids?: string[];
    target_grade_levels?: string[];
    target_course_ids?: string[];
  },
  student: {
    sectionId: string | null;
    gradeLevel: string | null;
    enrolledCourseIds: string[];
  }
): boolean {
  switch (announcement.target_type) {
    case "school":
      return true;

    case "section":
      if (!student.sectionId) return false;
      return announcement.target_section_ids?.includes(student.sectionId) ?? false;

    case "grade":
      if (!student.gradeLevel) return false;
      return announcement.target_grade_levels?.includes(student.gradeLevel) ?? false;

    case "course":
      if (student.enrolledCourseIds.length === 0) return false;
      return announcement.target_course_ids?.some((courseId) =>
        student.enrolledCourseIds.includes(courseId)
      ) ?? false;

    default:
      return false;
  }
}
