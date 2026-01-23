"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Announcement } from "@/lib/dal/announcements";

interface AnnouncementReadEvent {
  announcement_id: string;
  student_id: string;
  read_at: string;
}

interface UseRealtimeAnnouncementsOptions {
  /** Callback when an announcement is created */
  onAnnouncementCreated?: (announcement: Announcement) => void;
  /** Callback when an announcement is updated */
  onAnnouncementUpdated?: (announcement: Announcement) => void;
  /** Callback when an announcement is deleted */
  onAnnouncementDeleted?: (announcementId: string) => void;
  /** Callback when an announcement is read by a student */
  onAnnouncementRead?: (event: AnnouncementReadEvent) => void;
}

interface UseRealtimeAnnouncementsReturn {
  /** Connect to announcement stream */
  connect: () => void;
  /** Disconnect from announcement stream */
  disconnect: () => void;
  /** Whether connected */
  isConnected: boolean;
  /** Connection error */
  error: string | null;
  /** Map of announcement ID to read count increments since connection */
  readCountUpdates: Map<string, number>;
  /** Clear read count updates */
  clearReadCountUpdates: () => void;
}

/**
 * Hook for real-time announcement updates using Server-Sent Events (SSE)
 * Teachers receive updates about their announcements (edits, read receipts, etc.)
 */
export function useRealtimeAnnouncements(
  options: UseRealtimeAnnouncementsOptions = {}
): UseRealtimeAnnouncementsReturn {
  const { onAnnouncementCreated, onAnnouncementUpdated, onAnnouncementDeleted, onAnnouncementRead } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readCountUpdates, setReadCountUpdates] = useState<Map<string, number>>(new Map());

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Clear read count updates
  const clearReadCountUpdates = useCallback(() => {
    setReadCountUpdates(new Map());
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
      console.log("SSE Teacher Announcements connected:", data);
    });

    // Handle subscribed event
    eventSource.addEventListener("subscribed", (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE Teacher Announcements subscribed to channel:", data.channel);
      setIsConnected(true);
    });

    // Handle announcement created event
    eventSource.addEventListener("announcement_created", (event) => {
      const announcement = JSON.parse(event.data) as Announcement;
      console.log("SSE Teacher Announcements: Announcement created:", announcement.id);
      onAnnouncementCreated?.(announcement);
    });

    // Handle announcement updated event
    eventSource.addEventListener("announcement_updated", (event) => {
      const announcement = JSON.parse(event.data) as Announcement;
      console.log("SSE Teacher Announcements: Announcement updated:", announcement.id);
      onAnnouncementUpdated?.(announcement);
    });

    // Handle announcement deleted event
    eventSource.addEventListener("announcement_deleted", (event) => {
      const { id } = JSON.parse(event.data);
      console.log("SSE Teacher Announcements: Announcement deleted:", id);
      onAnnouncementDeleted?.(id);
    });

    // Handle announcement read event
    eventSource.addEventListener("announcement_read", (event) => {
      const readEvent = JSON.parse(event.data) as AnnouncementReadEvent;
      console.log("SSE Teacher Announcements: Announcement read:", readEvent.announcement_id);

      // Update read count for this announcement
      setReadCountUpdates((prev) => {
        const updated = new Map(prev);
        const currentCount = updated.get(readEvent.announcement_id) || 0;
        updated.set(readEvent.announcement_id, currentCount + 1);
        return updated;
      });

      onAnnouncementRead?.(readEvent);
    });

    // Handle heartbeat
    eventSource.addEventListener("heartbeat", () => {
      // Connection is alive
    });

    // Handle errors
    eventSource.addEventListener("error", (event) => {
      console.log("SSE Teacher Announcements error event:", event);
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
  }, [onAnnouncementCreated, onAnnouncementUpdated, onAnnouncementDeleted, onAnnouncementRead]);

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
    isConnected,
    error,
    readCountUpdates,
    clearReadCountUpdates,
  };
}
