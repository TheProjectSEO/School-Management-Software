/**
 * SSE (Server-Sent Events) endpoint for real-time message streaming
 * Uses Supabase Realtime internally but exposes SSE to the client
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
  console.log("[SSE Messages] Request received");

  // Use regular client for auth check
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[SSE Messages] Unauthorized:", authError?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  // Get profile_id from school_profiles
  const { data: profile, error: profileError } = await supabase
    .from("school_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.log("[SSE Messages] Profile not found:", profileError?.message);
    return new Response("Profile not found", { status: 404 });
  }

  const profileId = profile.id;

  // Get optional partner filter from query params
  const searchParams = request.nextUrl.searchParams;
  const partnerProfileId = searchParams.get("partner");

  console.log(`[SSE Messages] Setting up stream for profile: ${profileId}, partner: ${partnerProfileId}`);

  // Create service client for realtime subscriptions
  let realtimeClient;
  try {
    realtimeClient = createServiceClient();
  } catch (err) {
    console.error("[SSE Messages] Failed to create service client:", err);
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
          console.error("[SSE Messages] Error sending event:", err);
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
      }, 15000); // More frequent heartbeat

      // Send connected event immediately
      sendEvent("connected", { profileId, partnerProfileId, timestamp: Date.now() });

      // Create Supabase realtime channel
      const channelName = `messages:${profileId}:${Date.now()}`;

      console.log(`[SSE Messages] Creating channel: ${channelName}`);

      const channel = realtimeClient
        .channel(channelName)
        // Listen for ALL changes to teacher_direct_messages (no filter - more reliable)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events
            schema: "public",
            table: "teacher_direct_messages",
          },
          (payload) => {
            console.log(`[SSE Messages] Received ${payload.eventType}:`, payload);

            const message = payload.new || payload.old;
            if (!message) return;

            // Filter: only process messages TO or FROM this user
            const isToMe = message.to_profile_id === profileId;
            const isFromMe = message.from_profile_id === profileId;

            if (!isToMe && !isFromMe) {
              console.log(`[SSE Messages] Message not for this user, ignoring`);
              return;
            }

            // If partner filter is set, only show messages with that partner
            if (partnerProfileId) {
              const isWithPartner =
                message.from_profile_id === partnerProfileId ||
                message.to_profile_id === partnerProfileId;
              if (!isWithPartner) {
                console.log(`[SSE Messages] Message not with partner, ignoring`);
                return;
              }
            }

            // Determine event type
            if (payload.eventType === "INSERT") {
              // New message - only notify if it's TO this user (incoming)
              if (isToMe) {
                console.log(`[SSE Messages] Sending new_message event`);
                sendEvent("new_message", message);
              }
            } else if (payload.eventType === "UPDATE") {
              // Updated message (read receipt, delivered, etc.)
              console.log(`[SSE Messages] Sending message_updated event`);
              sendEvent("message_updated", message);
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[SSE Messages] Subscription status: ${status}`, err || '');

          if (status === "SUBSCRIBED") {
            console.log(`[SSE Messages] Successfully subscribed to channel`);
            sendEvent("subscribed", { channel: channelName, status: "ready" });
          } else if (status === "CLOSED") {
            console.log(`[SSE Messages] Channel closed`);
            sendEvent("error", { message: "Channel closed", status });
          } else if (status === "CHANNEL_ERROR") {
            console.error(`[SSE Messages] Channel error:`, err);
            sendEvent("error", { message: "Channel error", status, error: String(err) });
          } else if (status === "TIMED_OUT") {
            console.error(`[SSE Messages] Subscription timed out`);
            sendEvent("error", { message: "Subscription timed out", status });
          }
        });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`[SSE Messages] Client disconnected, cleaning up`);
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
