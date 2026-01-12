"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/dal/types";
import type { RealtimeChannel, RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

interface UseRealtimeNotificationsOptions {
  /** Whether to play a sound on new notification */
  playSound?: boolean;
  /** Callback when a new notification arrives */
  onNewNotification?: (notification: Notification) => void;
  /** Maximum number of notifications to keep in memory */
  maxNotifications?: number;
}

interface UseRealtimeNotificationsReturn {
  /** List of recent notifications */
  notifications: Notification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Whether the subscription is connected */
  isConnected: boolean;
  /** Error message if connection failed */
  error: string | null;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Manually refresh notifications */
  refresh: () => Promise<void>;
}

/**
 * Hook for real-time notifications using Supabase Realtime
 * Subscribes to the student_notifications table for INSERT and UPDATE events
 */
export function useRealtimeNotifications(
  studentId: string | null,
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    playSound = true,
    onNewNotification,
    maxNotifications = 50,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Audio for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on client side
  useEffect(() => {
    if (typeof window !== "undefined" && playSound) {
      // Use a simple notification sound (Web Audio API beep)
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRU5gLKqeUs4R3W4wJ1yOyc0drW7pGwjC0WKq6ZqQxseYpK3sHkuDDOGq7BxMRgYY5W8sXUtEzGHsLJ1MxkYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbI="
      );
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [playSound]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!studentId) return;

    try {
      const supabase = supabaseRef.current;

      // Fetch recent notifications
      const { data: notifs, error: notifError } = await supabase
        .from("student_notifications")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(maxNotifications);

      if (notifError) {
        console.error("Error fetching notifications:", notifError);
        setError("Failed to load notifications");
        return;
      }

      setNotifications(notifs || []);

      // Calculate unread count
      const unread = (notifs || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
      setError(null);
    } catch (err) {
      console.error("Error in fetchNotifications:", err);
      setError("Failed to load notifications");
    }
  }, [studentId, maxNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!studentId) return;

      try {
        const supabase = supabaseRef.current;

        const { error: updateError } = await supabase
          .from("student_notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("student_id", studentId);

        if (updateError) {
          console.error("Error marking notification as read:", updateError);
          return;
        }

        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error in markAsRead:", err);
      }
    },
    [studentId]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!studentId) return;

    try {
      const supabase = supabaseRef.current;

      const { error: updateError } = await supabase
        .from("student_notifications")
        .update({ is_read: true })
        .eq("student_id", studentId)
        .eq("is_read", false);

      if (updateError) {
        console.error("Error marking all notifications as read:", updateError);
        return;
      }

      // Optimistically update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error in markAllAsRead:", err);
    }
  }, [studentId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!studentId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial data
    fetchNotifications();

    // Create realtime channel
    const channel = supabase
      .channel(`notifications:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "school software",
          table: "student_notifications",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresInsertPayload<Notification>) => {
          const newNotification = payload.new as Notification;

          // Add new notification to the beginning of the list
          setNotifications((prev) => {
            const updated = [newNotification, ...prev];
            // Keep only maxNotifications
            return updated.slice(0, maxNotifications);
          });

          // Increment unread count if notification is unread
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
            playNotificationSound();
          }

          // Call the callback if provided
          onNewNotification?.(newNotification);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "school software",
          table: "student_notifications",
          filter: `student_id=eq.${studentId}`,
        },
        (payload: RealtimePostgresUpdatePayload<Notification>) => {
          const updatedNotification = payload.new as Notification;
          const oldNotification = payload.old as Partial<Notification>;

          // Update the notification in the list
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );

          // Update unread count if read status changed
          if (oldNotification.is_read === false && updatedNotification.is_read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          } else if (oldNotification.is_read === true && updatedNotification.is_read === false) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
          setError("Connection lost. Attempting to reconnect...");
        }
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studentId, fetchNotifications, maxNotifications, playNotificationSound, onNewNotification]);

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
