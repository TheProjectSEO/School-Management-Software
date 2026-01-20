"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DirectMessage } from "@/lib/dal/messages";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";

// Extended message type with delivery status
export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface RealtimeMessage extends DirectMessage {
  status?: MessageStatus;
  tempId?: string;
  delivered_at?: string;
}

interface UseRealtimeMessagesOptions {
  /** Play sound on new message */
  playSound?: boolean;
  /** Callback when a new message arrives */
  onNewMessage?: (message: DirectMessage) => void;
  /** Callback when message status changes (read receipt) */
  onMessageStatusChange?: (messageId: string, status: MessageStatus) => void;
}

interface UseRealtimeMessagesReturn {
  /** Subscribe to a specific conversation */
  subscribeToConversation: (partnerProfileId: string) => void;
  /** Unsubscribe from conversation */
  unsubscribeFromConversation: () => void;
  /** Latest new message received */
  newMessage: DirectMessage | null;
  /** Messages with updated read status */
  updatedMessages: Map<string, DirectMessage>;
  /** Whether subscribed */
  isSubscribed: boolean;
  /** Connection error */
  error: string | null;
  /** Clear new message state */
  clearNewMessage: () => void;
  /** Mark messages as delivered (call when user sees messages) */
  markAsDelivered: (partnerProfileId: string) => Promise<void>;
  /** Mark messages as read */
  markAsRead: (partnerProfileId: string) => Promise<void>;
}

/**
 * Hook for real-time message updates using Supabase Postgres Changes
 * Subscribes to INSERT (new messages) and UPDATE (read receipts) events
 */
export function useRealtimeMessages(
  profileId: string | null,
  options: UseRealtimeMessagesOptions = {}
): UseRealtimeMessagesReturn {
  const { playSound = true, onNewMessage, onMessageStatusChange } = options;

  const [newMessage, setNewMessage] = useState<DirectMessage | null>(null);
  const [updatedMessages, setUpdatedMessages] = useState<Map<string, DirectMessage>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPartnerRef = useRef<string | null>(null);

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined" && playSound) {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRU5gLKqeUs4R3W4wJ1yOyc0drW7pGwjC0WKq6ZqQxseYpK3sHkuDDOGq7BxMRgYY5W8sXUtEzGHsLJ1MxkYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbI="
      );
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [playSound]);

  // Clear new message state
  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  // Mark messages as delivered
  const markAsDelivered = useCallback(async (partnerProfileId: string) => {
    if (!profileId) return;

    const supabase = supabaseRef.current;
    try {
      await supabase.rpc("mark_messages_delivered", {
        p_profile_id: profileId,
        p_partner_profile_id: partnerProfileId,
      });
    } catch (err) {
      console.error("Error marking messages as delivered:", err);
    }
  }, [profileId]);

  // Mark messages as read
  const markAsRead = useCallback(async (partnerProfileId: string) => {
    if (!profileId) return;

    const supabase = supabaseRef.current;
    try {
      await supabase.rpc("mark_messages_read", {
        p_profile_id: profileId,
        p_partner_profile_id: partnerProfileId,
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [profileId]);

  // Subscribe to a specific conversation
  const subscribeToConversation = useCallback((partnerProfileId: string) => {
    if (!profileId) return;

    // If already subscribed to this partner, don't re-subscribe
    if (currentPartnerRef.current === partnerProfileId && channelRef.current) {
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }

    currentPartnerRef.current = partnerProfileId;
    const supabase = supabaseRef.current;

    // Create channel for this conversation
    const channel = supabase
      .channel(`messages:${profileId}:${partnerProfileId}`)
      // Listen for new messages TO me FROM partner
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `to_profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresInsertPayload<DirectMessage>) => {
          const message = payload.new as DirectMessage;

          // Only process if from current conversation partner
          if (message.from_profile_id === partnerProfileId) {
            setNewMessage(message);
            playNotificationSound();
            onNewMessage?.(message);
          }
        }
      )
      // Listen for updates to MY sent messages (read receipts)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `from_profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresUpdatePayload<DirectMessage>) => {
          const message = payload.new as DirectMessage;
          const oldMessage = payload.old as Partial<DirectMessage>;

          // Only process if to current conversation partner
          if (message.to_profile_id === partnerProfileId) {
            // Determine status change
            let newStatus: MessageStatus = "sent";
            if (message.is_read) {
              newStatus = "read";
            } else if ((message as RealtimeMessage).delivered_at) {
              newStatus = "delivered";
            }

            setUpdatedMessages((prev) => {
              const updated = new Map(prev);
              updated.set(message.id, message);
              return updated;
            });

            // Check if status actually changed
            if (
              (oldMessage.is_read === false && message.is_read === true) ||
              (!(oldMessage as RealtimeMessage).delivered_at && (message as RealtimeMessage).delivered_at)
            ) {
              onMessageStatusChange?.(message.id, newStatus);
            }
          }
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
  }, [profileId, playNotificationSound, onNewMessage, onMessageStatusChange]);

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
      currentPartnerRef.current = null;
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
    subscribeToConversation,
    unsubscribeFromConversation,
    newMessage,
    updatedMessages,
    isSubscribed,
    error,
    clearNewMessage,
    markAsDelivered,
    markAsRead,
  };
}
