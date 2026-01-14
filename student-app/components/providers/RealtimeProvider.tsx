"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { Notification } from "@/lib/dal/types";

interface RealtimeContextValue {
  /** Current student ID */
  studentId: string | null;
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Recent notifications */
  notifications: Notification[];
  /** Unread notification count */
  unreadCount: number;
  /** Connection error message */
  error: string | null;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Refresh notifications */
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  /** Optional: Pre-fetched student ID from server */
  initialStudentId?: string | null;
  /** Callback when new notification arrives */
  onNewNotification?: (notification: Notification) => void;
}

/**
 * Provider component that initializes Supabase realtime connection
 * and provides notification data to all child components
 */
export function RealtimeProvider({
  children,
  initialStudentId = null,
  onNewNotification,
}: RealtimeProviderProps) {
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);
  const [isInitialized, setIsInitialized] = useState(!!initialStudentId);

  // Fetch student ID from auth if not provided
  // Uses SECURITY DEFINER RPC to bypass RLS circular dependencies
  useEffect(() => {
    if (initialStudentId) {
      setStudentId(initialStudentId);
      setIsInitialized(true);
      return;
    }

    const fetchStudentId = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Use RPC function that bypasses RLS circular dependencies
          const { data, error } = await supabase.rpc("get_student_profile", {
            user_auth_id: user.id,
          });

          if (error) {
            console.error("Error fetching profile in RealtimeProvider:", error);
          } else if (data && data.length > 0) {
            setStudentId(data[0].student_id);
          }
        }
      } catch (error) {
        console.error("Error fetching student ID:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    fetchStudentId();
  }, [initialStudentId]);

  // Handle new notification callback with toast/sound
  const handleNewNotification = useCallback(
    (notification: Notification) => {
      // Call the optional callback
      onNewNotification?.(notification);

      // You could add toast notification here
      // e.g., toast.info(notification.title);
    },
    [onNewNotification]
  );

  // Use the realtime notifications hook
  const {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotifications,
  } = useRealtimeNotifications(studentId, {
    playSound: true,
    onNewNotification: handleNewNotification,
    maxNotifications: 50,
  });

  // Don't render children until we've attempted to get the student ID
  if (!isInitialized) {
    return null;
  }

  const value: RealtimeContextValue = {
    studentId,
    isConnected,
    notifications,
    unreadCount,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access realtime notification data from any component
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }

  return context;
}

/**
 * Hook specifically for notification data (convenience wrapper)
 */
export function useNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useRealtime();

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotifications,
  };
}
