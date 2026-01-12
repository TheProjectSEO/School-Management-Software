"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { DirectMessage } from "@/lib/dal/messages";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";

interface MessageNotificationContextType {
  /** Total unread message count */
  unreadCount: number;
  /** Refresh the unread count */
  refreshUnreadCount: () => Promise<void>;
  /** Decrement count (call when marking as read) */
  decrementUnreadCount: (amount?: number) => void;
  /** Whether connected to realtime */
  isConnected: boolean;
}

const MessageNotificationContext = createContext<MessageNotificationContextType | null>(null);

export function useMessageNotifications() {
  const context = useContext(MessageNotificationContext);
  if (!context) {
    throw new Error("useMessageNotifications must be used within MessageNotificationProvider");
  }
  return context;
}

interface MessageNotificationProviderProps {
  children: React.ReactNode;
  profileId: string | null;
  teacherId: string | null;
  userName?: string;
}

/**
 * Global provider for message notifications
 * Subscribes at the app level to show toast notifications for new messages
 * regardless of which page the user is on
 */
export function MessageNotificationProvider({
  children,
  profileId,
  teacherId,
  userName,
}: MessageNotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRU5gLKqeUs4R3W4wJ1yOyc0drW7pGwjC0WKq6ZqQxseYpK3sHkuDDOGq7BxMRgYY5W8sXUtEzGHsLJ1MxkYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbI="
      );
      audioRef.current.volume = 0.3;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // Fetch initial unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!profileId) return;

    const supabase = supabaseRef.current;

    const { data, error } = await supabase.rpc("get_unread_count", {
      p_profile_id: profileId,
    });

    if (!error) {
      setUnreadCount(data || 0);
    }
  }, [profileId]);

  // Decrement unread count
  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  // Show toast notification for new message
  const showNewMessageToast = useCallback((message: DirectMessage, senderName?: string) => {
    const displayName = senderName || "New message";
    const preview = message.body.length > 50 ? `${message.body.slice(0, 50)}...` : message.body;

    toast.message(displayName, {
      description: preview,
      action: {
        label: "View",
        onClick: () => {
          // Navigate to messages
          window.location.href = `/teacher/messages?partner=${message.from_profile_id}`;
        },
      },
      duration: 5000,
    });

    // Show browser notification if supported and tab not focused
    if (typeof window !== "undefined" && document.hidden && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`Message from ${displayName}`, {
          body: preview,
          icon: "/brand/msu-logo.png",
          tag: `message-${message.id}`,
        });
      }
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      // Request permission after a delay to avoid being too aggressive
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!profileId) {
      setUnreadCount(0);
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial unread count
    refreshUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel(`global-messages:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "school software",
          table: "teacher_direct_messages",
          filter: `to_profile_id=eq.${profileId}`,
        },
        async (payload: RealtimePostgresInsertPayload<DirectMessage>) => {
          const message = payload.new as DirectMessage;

          // Increment unread count
          setUnreadCount((prev) => prev + 1);

          // Play sound
          playNotificationSound();

          // Get sender name
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", message.from_profile_id)
            .single();

          // Show toast
          showNewMessageToast(message, senderProfile?.full_name);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profileId, refreshUnreadCount, playNotificationSound, showNewMessageToast]);

  return (
    <MessageNotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        isConnected,
      }}
    >
      {children}
    </MessageNotificationContext.Provider>
  );
}
