"use client";

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
 * Subscribes to messages and applications in real-time
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

  // Fetch initial counts
  const fetchCounts = useCallback(async () => {
    if (!profileId || !schoolId) return;

    const supabase = supabaseRef.current;

    try {
      // Fetch unread message count
      const { data: msgData } = await supabase.rpc("get_unread_count", {
        p_profile_id: profileId,
      });
      setUnreadMessageCount(msgData || 0);

      // Fetch pending applications count
      const { count: appCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "pending");
      setPendingApplicationsCount(appCount || 0);
    } catch (error) {
      console.error("Error fetching admin notification counts:", error);
    }
  }, [profileId, schoolId]);

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
    if (!profileId || !schoolId) {
      setUnreadMessageCount(0);
      setPendingApplicationsCount(0);
      return;
    }

    const supabase = supabaseRef.current;

    // Fetch initial counts
    fetchCounts();

    // Subscribe to new messages and applications
    const channel = supabase
      .channel(`admin-notifications:${profileId}`)
      // Listen for new messages
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

          // Increment unread count
          setUnreadMessageCount((prev) => prev + 1);

          // Play sound
          playMessageSound();

          // Get sender name
          const { data: senderProfile } = await supabase
            .from("school_profiles")
            .select("full_name")
            .eq("id", message.from_profile_id)
            .single();

          // Show toast
          showMessageToast(senderProfile?.full_name || "Unknown", message.body);

          // Browser notification if tab hidden
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
      // Listen for new applications
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `school_id=eq.${schoolId}`,
        },
        async (payload) => {
          const application = payload.new as {
            id: string;
            applicant_name: string;
            status: string;
          };

          if (application.status === "pending") {
            // Increment pending count
            setPendingApplicationsCount((prev) => prev + 1);

            // Play alert sound for new applications
            playAlertSound();

            // Show toast
            showApplicationToast(application.applicant_name);

            // Browser notification if tab hidden
            if (typeof window !== "undefined" && document.hidden && "Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification("New Application", {
                  body: `${application.applicant_name} submitted an application`,
                  icon: "/brand/logo.png",
                  tag: `admin-application-${application.id}`,
                });
              }
            }
          }
        }
      )
      // Listen for application status updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          const oldApp = payload.old as { status: string };
          const newApp = payload.new as { status: string };

          // If status changed from pending to something else, decrement count
          if (oldApp.status === "pending" && newApp.status !== "pending") {
            setPendingApplicationsCount((prev) => Math.max(0, prev - 1));
          }
          // If status changed to pending from something else, increment count
          else if (oldApp.status !== "pending" && newApp.status === "pending") {
            setPendingApplicationsCount((prev) => prev + 1);
          }
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
  }, [profileId, schoolId, fetchCounts, showMessageToast, showApplicationToast]);

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
