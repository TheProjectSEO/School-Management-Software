/**
 * SSE (Server-Sent Events) endpoint for real-time announcement streaming
 * Teachers receive updates about their announcements (read counts, etc.)
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
  // Use regular client for auth check
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get teacher profile
  const { data: profile, error: profileError } = await supabase
    .from("school_profiles")
    .select("id, school_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response("Profile not found", { status: 404 });
  }

  // Get teacher ID
  const { data: teacher, error: teacherError } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (teacherError || !teacher) {
    return new Response("Teacher not found", { status: 404 });
  }

  const profileId = profile.id;
  const schoolId = profile.school_id;
  const teacherId = teacher.id;

  // Create service client for realtime subscriptions
  const realtimeClient = createServiceClient();

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
        } catch {
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
      }, 30000);

      // Send connected event
      sendEvent("connected", { profileId, teacherId, timestamp: Date.now() });

      // Create Supabase realtime channels
      const announcementChannelName = `sse:teacher-announcements:${teacherId}`;
      const readsChannelName = `sse:announcement-reads:${teacherId}`;

      console.log(`[SSE Teacher Announcements] Creating channels for teacher: ${teacherId}`);

      // Channel for announcement changes (this teacher's announcements)
      const announcementChannel = realtimeClient
        .channel(announcementChannelName)
        // Listen for changes to this teacher's announcements
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "teacher_announcements",
            filter: `teacher_id=eq.${teacherId}`,
          },
          (payload) => {
            console.log(`[SSE Teacher Announcements] Announcement created:`, payload.new.id);
            sendEvent("announcement_created", payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "teacher_announcements",
            filter: `teacher_id=eq.${teacherId}`,
          },
          (payload) => {
            console.log(`[SSE Teacher Announcements] Announcement updated:`, payload.new.id);
            sendEvent("announcement_updated", payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "teacher_announcements",
            filter: `teacher_id=eq.${teacherId}`,
          },
          (payload) => {
            console.log(`[SSE Teacher Announcements] Announcement deleted:`, payload.old.id);
            sendEvent("announcement_deleted", { id: payload.old.id });
          }
        )
        .subscribe((status, err) => {
          console.log(`[SSE Teacher Announcements] Announcement channel status: ${status}`, err ? `Error: ${err}` : '');
          if (status === "SUBSCRIBED") {
            sendEvent("subscribed", { channel: announcementChannelName });
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            sendEvent("error", { message: "Announcement channel error", status, error: err?.message });
          }
        });

      // Channel for read receipts on this teacher's announcements
      // We need to track reads on announcements this teacher created
      const readsChannel = realtimeClient
        .channel(readsChannelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "announcement_reads",
          },
          async (payload) => {
            const read = payload.new;

            // Check if this read is for one of this teacher's announcements
            // We need to verify the announcement belongs to this teacher
            const { data: announcement } = await realtimeClient
              .from("teacher_announcements")
              .select("id, teacher_id")
              .eq("id", read.announcement_id)
              .eq("teacher_id", teacherId)
              .single();

            if (announcement) {
              console.log(`[SSE Teacher Announcements] Announcement read:`, read.announcement_id);
              sendEvent("announcement_read", {
                announcement_id: read.announcement_id,
                student_id: read.student_id,
                read_at: read.read_at,
              });
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[SSE Teacher Announcements] Reads channel status: ${status}`, err ? `Error: ${err}` : '');
          if (status === "SUBSCRIBED") {
            sendEvent("subscribed", { channel: readsChannelName });
          }
        });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`[SSE Teacher Announcements] Client disconnected, cleaning up channels`);
        isConnectionClosed = true;
        clearInterval(heartbeatInterval);
        realtimeClient.removeChannel(announcementChannel);
        realtimeClient.removeChannel(readsChannel);
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
