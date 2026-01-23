"use client";

import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/lib/dal";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface NotificationsClientProps {
  notifications: Notification[];
  unreadCount: number;
  studentId: string;
}

type FilterType = "all" | "unread" | "assignment" | "grade" | "announcement";

const filters = [
  { name: "All Notifications", icon: "inbox", key: "all" as FilterType },
  { name: "Unread", icon: "mark_email_unread", key: "unread" as FilterType },
  { name: "Assignments", icon: "assignment", key: "assignment" as FilterType },
  { name: "Grades", icon: "school", key: "grade" as FilterType },
  { name: "Campus News", icon: "newspaper", key: "announcement" as FilterType },
];

function getNotificationStyle(type: Notification["type"]) {
  switch (type) {
    case "assignment":
      return {
        borderColor: "border-l-msu-gold",
        iconBg: "bg-yellow-50 dark:bg-yellow-900/20",
        iconColor: "text-yellow-700 dark:text-msu-gold",
        icon: "assignment",
      };
    case "grade":
      return {
        borderColor: "border-l-msu-green",
        iconBg: "bg-green-50 dark:bg-green-900/20",
        iconColor: "text-msu-green dark:text-green-400",
        icon: "grade",
      };
    case "announcement":
      return {
        borderColor: "border-l-orange-500",
        iconBg: "bg-orange-50 dark:bg-orange-900/20",
        iconColor: "text-orange-600 dark:text-orange-400",
        icon: "campaign",
      };
    case "warning":
      return {
        borderColor: "border-l-orange-600",
        iconBg: "bg-orange-50 dark:bg-orange-900/20",
        iconColor: "text-orange-700 dark:text-orange-500",
        icon: "warning",
      };
    case "error":
      return {
        borderColor: "border-l-primary",
        iconBg: "bg-red-50 dark:bg-red-900/20",
        iconColor: "text-primary dark:text-red-400",
        icon: "error",
      };
    case "success":
      return {
        borderColor: "border-l-green-500",
        iconBg: "bg-green-50 dark:bg-green-900/20",
        iconColor: "text-green-600 dark:text-green-400",
        icon: "check_circle",
      };
    case "info":
    default:
      return {
        borderColor: "border-l-blue-500",
        iconBg: "bg-blue-50 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        icon: "info",
      };
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function NotificationsClient({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  studentId
}: NotificationsClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);

  // Use realtime notifications hook
  const {
    notifications: realtimeNotifications,
    unreadCount: realtimeUnreadCount,
    isConnected,
    markAsRead,
    markAllAsRead: realtimeMarkAllAsRead,
  } = useRealtimeNotifications(studentId, {
    playSound: true,
    onNewNotification: useCallback(() => {
      // Show a visual indicator when new notification arrives
      setShowNewBadge(true);
      setTimeout(() => setShowNewBadge(false), 3000);
    }, []),
  });

  // Use realtime data if available, otherwise fall back to initial data
  const notifications = realtimeNotifications.length > 0 ? realtimeNotifications : initialNotifications;
  const unreadCount = realtimeNotifications.length > 0 ? realtimeUnreadCount : initialUnreadCount;

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.is_read;
    return notification.type === activeFilter;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead) return;

    setIsMarkingAllRead(true);
    try {
      await realtimeMarkAllAsRead();
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 gap-6 sticky top-0 self-start h-auto py-8 px-6 bg-white dark:bg-[#1a2634] border-r border-slate-200 dark:border-slate-700">
        <div className="flex flex-col gap-2">
          <h2 className="text-primary dark:text-msu-gold text-lg font-bold mb-2 uppercase tracking-wide">
            Filters
          </h2>
          <nav className="flex flex-col gap-1">
            {filters.map((filter) => {
              const count =
                filter.key === "unread"
                  ? unreadCount
                  : filter.key === "all"
                  ? null
                  : notifications.filter((n) => n.type === filter.key).length;

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    activeFilter === filter.key
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      activeFilter !== filter.key ? "text-primary dark:text-msu-gold" : ""
                    }`}
                  >
                    {filter.icon}
                  </span>
                  <span>{filter.name}</span>
                  {count !== null && count > 0 && (
                    <span className="ml-auto bg-msu-gold text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Help Card */}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-primary/10 to-msu-gold/10 p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2 text-primary dark:text-msu-gold">
            <span className="material-symbols-outlined">help</span>
            <span className="font-bold text-sm">Need Help?</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Contact the registrar or student support for enrollment issues.
          </p>
          <button className="text-xs font-bold text-primary hover:text-msu-gold dark:text-msu-gold dark:hover:text-white transition-colors uppercase tracking-wide">
            Contact Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-col flex-1 max-w-[800px] py-8 px-4 sm:px-6 lg:px-8">
        {/* New Notification Banner */}
        {showNewBadge && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary dark:text-msu-gold animate-pulse">
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            <span className="font-medium">New notification received!</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary dark:text-white tracking-tight">
                Notifications
              </h1>
              {/* Connection Status */}
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
                title={isConnected ? "Live updates active" : "Reconnecting..."}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                  }`}
                />
                {isConnected ? "Live" : "Connecting"}
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Stay updated with your latest alerts and announcements
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-primary dark:text-msu-gold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              {isMarkingAllRead ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* Notification Cards */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">
                {activeFilter === "unread" ? "mark_email_read" : "notifications_off"}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {activeFilter === "unread" ? "All caught up!" : "No notifications"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              {activeFilter === "unread"
                ? "You have no unread notifications at the moment."
                : activeFilter === "all"
                ? "You don't have any notifications yet. Check back later for updates."
                : `No ${activeFilter} notifications found.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              const isUrgent = notification.type === "error" || notification.type === "warning";

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                  className={`group relative flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#1a2634] p-5 rounded-xl shadow-sm border-l-4 ${style.borderColor} border-y border-r border-slate-100 dark:border-slate-700 hover:shadow-md transition-all ${
                    notification.action_url ? "cursor-pointer" : ""
                  } ${notification.is_read ? "opacity-75 hover:opacity-100" : ""}`}
                >
                  {/* Unread Indicator & Urgent Badge */}
                  <div className="absolute top-5 right-5 flex gap-2">
                    {isUrgent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Urgent
                      </span>
                    )}
                    {!notification.is_read && (
                      <div className="size-2.5 rounded-full bg-primary mt-1"></div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="shrink-0">
                    <div
                      className={`size-12 rounded-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center`}
                    >
                      <span className="material-symbols-outlined">{style.icon}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4 pr-8">
                    <div className="flex flex-col gap-1">
                      <h3
                        className={`text-base ${
                          !notification.is_read ? "font-bold" : "font-semibold"
                        } text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-msu-gold transition-colors`}
                      >
                        {notification.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatTimestamp(notification.created_at)}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Action Button */}
                    {notification.action_url && (
                      <div className="flex items-center shrink-0">
                        <button
                          className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            notification.type === "assignment"
                              ? "bg-primary hover:bg-[#5a0c0e] text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-700 text-primary dark:text-msu-gold hover:bg-primary hover:text-white dark:hover:bg-slate-600"
                          }`}
                        >
                          <span>View</span>
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More - Only show if we have notifications and possibly more to load */}
        {filteredNotifications.length >= 20 && (
          <div className="mt-8 flex justify-center">
            <button className="text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-msu-gold transition-colors flex items-center gap-1">
              Load earlier notifications
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
