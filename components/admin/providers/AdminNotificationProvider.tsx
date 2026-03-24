"use client";

import { authFetch } from "@/lib/utils/authFetch";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { playMessageSound, playAlertSound } from "@/lib/utils/notificationSound";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AdminNotificationContextType {
  /** Total unread message count */
  unreadMessageCount: number;
  /** New applications pending count */
  pendingApplicationsCount: number;
  /** Refresh counts */
  refresh: () => Promise<void>;
  /** Whether connected to realtime */
  isConnected: boolean;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | null>(null);

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    // Return default values when not in provider
    return {
      unreadMessageCount: 0,
      pendingApplicationsCount: 0,
      refresh: async () => {},
      isConnected: false,
    };
  }
  return context;
}

interface AdminNotificationProviderProps {
  children: React.ReactNode;
  adminId: string | null;
  profileId: string | null;
  schoolId: string | null;
}

/**
 * Global provider for admin notifications
 * Subscribes to messages in real-time and fetches counts via API route
 */
export function AdminNotificationProvider({
  children,
  adminId,
  profileId,
  schoolId,
}: AdminNotificationProviderProps) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Fetch counts via API route (avoids RLS issues with browser anon client)
  const fetchCounts = useCallback(async () => {
    if (!profileId) return;

    try {
      const response = await authFetch("/api/admin/notifications/counts");
      if (!response.ok) return;
      const data = await response.json();
      setUnreadMessageCount(data.unreadMessages || 0);
      setPendingApplicationsCount(data.pendingApplications || 0);
    } catch {
      // Silently fail — counts remain at 0
    }
  }, [profileId]);

  // Show toast for new message
  const showMessageToast = useCallback((senderName: string, preview: string) => {
    toast.message(`Message from ${senderName}`, {
      description: preview.length > 50 ? `${preview.slice(0, 50)}...` : preview,
      action: {
        label: "View",
        onClick: () => {
          window.location.href = "/admin/messages";
        },
      },
      duration: 5000,
    });
  }, []);

  // Show toast for new application
  const showApplicationToast = useCallback((applicantName: string) => {
    toast.message("New Application", {
      description: `${applicantName} submitted an application`,
      action: {
        label: "Review",
        onClick: () => {
          window.location.href = "/admin/applications";
        },
      },
      duration: 5000,
    });
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!profileId) {
      setUnreadMessageCount(0);
      setPendingApplicationsCount(0);
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial counts
    fetchCounts();

    // Subscribe to new messages + new applications in one channel
    const channel = supabase
      .channel(`admin-notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `to_profile_id=eq.${profileId}`,
        },
        async (payload) => {
          const message = payload.new as {
            id: string;
            from_profile_id: string;
            body: string;
          };

          setUnreadMessageCount((prev) => prev + 1);
          playMessageSound();

          const { data: senderProfile } = await supabase
            .from("school_profiles")
            .select("full_name")
            .eq("id", message.from_profile_id)
            .single();

          showMessageToast(senderProfile?.full_name || "Unknown", message.body);

          if (typeof window !== "undefined" && document.hidden && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(`New message from ${senderProfile?.full_name || "Unknown"}`, {
                body: message.body.slice(0, 100),
                icon: "/brand/logo.png",
                tag: `admin-message-${message.id}`,
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_applications",
        },
        (payload) => {
          const app = payload.new as {
            first_name?: string;
            last_name?: string;
          };
          const name = [app.first_name, app.last_name].filter(Boolean).join(" ") || "Someone";
          setPendingApplicationsCount((prev) => prev + 1);
          playAlertSound();
          showApplicationToast(name);

          if (typeof window !== "undefined" && document.hidden && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("New Application Received", {
                body: `${name} submitted an application`,
                icon: "/brand/logo.png",
                tag: `admin-application-${Date.now()}`,
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "student_applications",
        },
        () => {
          // Re-fetch counts so badge stays accurate after approvals/rejections
          fetchCounts();
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
  }, [profileId, fetchCounts, showMessageToast, showApplicationToast]);

  return (
    <AdminNotificationContext.Provider
      value={{
        unreadMessageCount,
        pendingApplicationsCount,
        refresh: fetchCounts,
        isConnected,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}
