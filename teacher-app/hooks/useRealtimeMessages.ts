"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DirectMessage } from "@/lib/dal/messages";

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
 * Hook for real-time message updates using Supabase Realtime (browser client)
 * Subscribes to INSERT (new messages) and UPDATE (read receipts) events
 * Uses postgres_changes directly from browser for better reliability
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

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
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

  // Subscribe to a specific conversation using browser Supabase client
  const subscribeToConversation = useCallback((partnerProfileId: string) => {
    if (!profileId) {
      console.log("[useRealtimeMessages] No profileId, skipping subscription");
      return;
    }

    // If already subscribed to this partner, don't re-subscribe
    if (currentPartnerRef.current === partnerProfileId && channelRef.current) {
      console.log("[useRealtimeMessages] Already subscribed to this partner");
      return;
    }

    // Clean up existing subscription
    if (channelRef.current) {
      console.log("[useRealtimeMessages] Cleaning up existing channel");
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    currentPartnerRef.current = partnerProfileId;
    const supabase = supabaseRef.current;

    // Create unique channel name
    const channelName = `messages:${profileId}:${partnerProfileId}:${Date.now()}`;
    console.log(`[useRealtimeMessages] Creating channel: ${channelName}`);

    // Subscribe to postgres_changes directly from browser client
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_direct_messages",
        },
        (payload) => {
          console.log(`[useRealtimeMessages] Received ${payload.eventType}:`, payload);

          const message = (payload.new || payload.old) as DirectMessage | null;
          if (!message) return;

          // Filter: only process messages TO or FROM this user
          const isToMe = message.to_profile_id === profileId;
          const isFromMe = message.from_profile_id === profileId;

          if (!isToMe && !isFromMe) {
            console.log(`[useRealtimeMessages] Message not for this user, ignoring`);
            return;
          }

          // Only show messages with the current partner
          const isWithPartner =
            message.from_profile_id === partnerProfileId ||
            message.to_profile_id === partnerProfileId;
          if (!isWithPartner) {
            console.log(`[useRealtimeMessages] Message not with partner, ignoring`);
            return;
          }

          // Handle different event types
          if (payload.eventType === "INSERT") {
            // New message - only notify if it's TO this user (incoming)
            if (isToMe && message.from_profile_id === partnerProfileId) {
              console.log(`[useRealtimeMessages] New incoming message from partner`);
              setNewMessage(message);
              playNotificationSound();
              onNewMessage?.(message);
            }
          } else if (payload.eventType === "UPDATE") {
            // Updated message (read receipt, delivered, etc.)
            console.log(`[useRealtimeMessages] Message updated`);

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

            onMessageStatusChange?.(message.id, newStatus);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[useRealtimeMessages] Subscription status: ${status}`, err || "");

        if (status === "SUBSCRIBED") {
          console.log(`[useRealtimeMessages] Successfully subscribed`);
          setIsSubscribed(true);
          setError(null);
        } else if (status === "CLOSED") {
          console.log(`[useRealtimeMessages] Channel closed`);
          setIsSubscribed(false);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[useRealtimeMessages] Channel error:`, err);
          setError("Connection error");
          setIsSubscribed(false);
        } else if (status === "TIMED_OUT") {
          console.error(`[useRealtimeMessages] Subscription timed out`);
          setError("Connection timed out");
          setIsSubscribed(false);
        }
      });

    channelRef.current = channel;
  }, [profileId, playNotificationSound, onNewMessage, onMessageStatusChange]);

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback(() => {
    if (channelRef.current) {
      console.log("[useRealtimeMessages] Unsubscribing from channel");
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    currentPartnerRef.current = null;
    setIsSubscribed(false);
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
