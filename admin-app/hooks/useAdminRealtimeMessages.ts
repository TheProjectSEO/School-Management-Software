"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";

interface AdminDirectMessage {
  id: string;
  admin_id: string | null;
  from_student_id: string | null;
  to_student_id: string | null;
  from_teacher_id: string | null;
  to_teacher_id: string | null;
  subject: string;
  body: string;
  is_read: boolean;
  read_at?: string | null;
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
    if (channelRef.current) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`admin-messages:${adminProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `admin_id=eq.${adminProfileId}`,
        },
        (payload: RealtimePostgresInsertPayload<AdminDirectMessage>) => {
          setNewMessage(payload.new as AdminDirectMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `admin_id=eq.${adminProfileId}`,
        },
        (payload: RealtimePostgresUpdatePayload<AdminDirectMessage>) => {
          const message = payload.new as AdminDirectMessage;
          setUpdatedMessages((prev) => {
            const updated = new Map(prev);
            updated.set(message.id, message);
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
