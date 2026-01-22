"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Announcement } from "@/lib/dal/types";

interface UseRealtimeAnnouncementsOptions {
  /** Play sound on new announcement */
  playSound?: boolean;
  /** Callback when a new announcement arrives */
  onNewAnnouncement?: (announcement: Announcement) => void;
  /** Callback when an announcement is updated */
  onAnnouncementUpdated?: (announcement: Announcement) => void;
  /** Callback when an announcement is deleted */
  onAnnouncementDeleted?: (announcementId: string) => void;
}

interface UseRealtimeAnnouncementsReturn {
  /** Connect to announcement stream */
  connect: () => void;
  /** Disconnect from announcement stream */
  disconnect: () => void;
  /** Latest new announcement received */
  newAnnouncement: Announcement | null;
  /** Whether connected */
  isConnected: boolean;
  /** Connection error */
  error: string | null;
  /** Clear new announcement state */
  clearNewAnnouncement: () => void;
}

/**
 * Hook for real-time announcement updates using Server-Sent Events (SSE)
 * Subscribes to new announcements targeted to the student
 */
export function useRealtimeAnnouncements(
  options: UseRealtimeAnnouncementsOptions = {}
): UseRealtimeAnnouncementsReturn {
  const { playSound = true, onNewAnnouncement, onAnnouncementUpdated, onAnnouncementDeleted } = options;

  const [newAnnouncement, setNewAnnouncement] = useState<Announcement | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined" && playSound) {
      // Use a different tone for announcements (slightly higher pitch)
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRU5gLKqeUs4R3W4wJ1yOyc0drW7pGwjC0WKq6ZqQxseYpK3sHkuDDOGq7BxMRgYY5W8sXUtEzGHsLJ1MxkYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbI="
      );
      audioRef.current.volume = 0.4;
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [playSound]);

  // Clear new announcement state
  const clearNewAnnouncement = useCallback(() => {
    setNewAnnouncement(null);
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    // If already connected, don't reconnect
    if (eventSourceRef.current) {
      return;
    }

    // Build SSE URL
    const url = new URL("/api/announcements/stream", window.location.origin);

    // Create EventSource connection
    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    // Handle connection event
    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE Announcements connected:", data);
    });

    // Handle subscribed event
    eventSource.addEventListener("subscribed", (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE Announcements subscribed to channel:", data.channel);
      setIsConnected(true);
    });

    // Handle new announcement event
    eventSource.addEventListener("new_announcement", (event) => {
      const announcement = JSON.parse(event.data) as Announcement;
      console.log("SSE Announcements: New announcement received:", announcement.id);

      setNewAnnouncement(announcement);
      playNotificationSound();
      onNewAnnouncement?.(announcement);
    });

    // Handle announcement updated event
    eventSource.addEventListener("announcement_updated", (event) => {
      const announcement = JSON.parse(event.data) as Announcement;
      console.log("SSE Announcements: Announcement updated:", announcement.id);
      onAnnouncementUpdated?.(announcement);
    });

    // Handle announcement deleted event
    eventSource.addEventListener("announcement_deleted", (event) => {
      const { id } = JSON.parse(event.data);
      console.log("SSE Announcements: Announcement deleted:", id);
      onAnnouncementDeleted?.(id);
    });

    // Handle heartbeat
    eventSource.addEventListener("heartbeat", () => {
      // Connection is alive
    });

    // Handle errors
    eventSource.addEventListener("error", (event) => {
      console.log("SSE Announcements error event:", event);
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost");
      eventSource.close();

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    eventSourceRef.current = eventSource;
  }, [playNotificationSound, onNewAnnouncement, onAnnouncementUpdated, onAnnouncementDeleted]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    newAnnouncement,
    isConnected,
    error,
    clearNewAnnouncement,
  };
}
