"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playMessageSound } from "@/lib/utils/notificationSound";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Matches the actual teacher_direct_messages table schema
interface AdminDirectMessage {
  id: string;
  school_id: string;
  from_profile_id: string;
  to_profile_id: string;
  body: string;
  sender_type: "admin" | "teacher" | "student";
  is_read: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface UseAdminRealtimeMessagesReturn {
  subscribe: () => void;
  unsubscribe: () => void;
  newMessage: AdminDirectMessage | null;
  updatedMessages: Map<string, AdminDirectMessage>;
  isSubscribed: boolean;
  error: string | null;
  clearNewMessage: () => void;
}

export function useAdminRealtimeMessages(adminProfileId: string | null): UseAdminRealtimeMessagesReturn {
  const [newMessage, setNewMessage] = useState<AdminDirectMessage | null>(null);
  const [updatedMessages, setUpdatedMessages] = useState<Map<string, AdminDirectMessage>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  const subscribe = useCallback(() => {
    if (!adminProfileId) return;
    if (channelRef.current) return; // already subscribed

    const supabase = supabaseRef.current;

    // Single channel, two postgres_changes listeners:
    //   1. Incoming messages  (to_profile_id = adminProfileId)
    //   2. Outgoing updates   (from_profile_id = adminProfileId) — catches read-receipt UPDATEs
    const channel = supabase
      .channel(`admin-messages:${adminProfileId}`)
      // --- Incoming INSERT ---
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `to_profile_id=eq.${adminProfileId}`,
        },
        (payload) => {
          const msg = payload.new as AdminDirectMessage;
          setNewMessage(msg);
          playMessageSound(0.4);
        }
      )
      // --- Outgoing INSERT (admin sent) — no notification needed, optimistic UI handles it ---
      // --- Incoming UPDATE (e.g. sender marked delivered/read on their side) ---
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `to_profile_id=eq.${adminProfileId}`,
        },
        (payload) => {
          const msg = payload.new as AdminDirectMessage;
          if (!msg?.id) return; // REPLICA IDENTITY not FULL — guard against empty payload
          setUpdatedMessages((prev) => {
            const updated = new Map(prev);
            updated.set(msg.id, msg);
            return updated;
          });
        }
      )
      // --- Outgoing UPDATE (read receipt: recipient marked admin's message as read) ---
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `from_profile_id=eq.${adminProfileId}`,
        },
        (payload) => {
          const msg = payload.new as AdminDirectMessage;
          if (!msg?.id) return;
          setUpdatedMessages((prev) => {
            const updated = new Map(prev);
            updated.set(msg.id, msg);
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
          setError(null);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsSubscribed(false);
          setError("Connection lost");
        }
      });

    channelRef.current = channel;
  }, [adminProfileId]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    subscribe,
    unsubscribe,
    newMessage,
    updatedMessages,
    isSubscribed,
    error,
    clearNewMessage,
  };
}
