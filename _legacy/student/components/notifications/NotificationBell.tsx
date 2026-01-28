"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/lib/dal/types";

interface NotificationBellProps {
  /** Whether to show as a compact icon-only button */
  compact?: boolean;
  /** Custom class name for styling */
  className?: string;
}

function getNotificationIcon(type: Notification["type"]): string {
  switch (type) {
    case "assignment":
      return "assignment";
    case "grade":
      return "grade";
    case "announcement":
      return "campaign";
    case "warning":
      return "warning";
    case "error":
      return "error";
    case "success":
      return "check_circle";
    case "info":
    default:
      return "info";
  }
}

function getNotificationColor(type: Notification["type"]): string {
  switch (type) {
    case "assignment":
      return "text-yellow-600 dark:text-msu-gold";
    case "grade":
      return "text-green-600 dark:text-green-400";
    case "announcement":
      return "text-orange-500 dark:text-orange-400";
    case "warning":
      return "text-orange-600 dark:text-orange-500";
    case "error":
      return "text-red-600 dark:text-red-400";
    case "success":
      return "text-green-500 dark:text-green-400";
    case "info":
    default:
      return "text-blue-500 dark:text-blue-400";
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

/**
 * Notification bell component with real-time updates
 * Shows unread count badge and dropdown with recent notifications
 */
export function NotificationBell({ compact = false, className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useRealtime();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      setIsOpen(false);
      window.location.href = notification.action_url;
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
          compact ? "p-2" : "p-2.5"
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={`material-symbols-outlined ${compact ? "text-[20px]" : "text-[24px]"}`}>
          {unreadCount > 0 ? "notifications_active" : "notifications"}
        </span>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Connection indicator (small dot) */}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500" title="Reconnecting..." />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl bg-white shadow-lg ring-1 ring-slate-200 dark:bg-[#1a2634] dark:ring-slate-700"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await markAllAsRead();
                }}
                className="text-xs font-medium text-primary hover:text-primary/80 dark:text-msu-gold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined mb-2 text-3xl text-slate-300 dark:text-slate-600">
                  notifications_off
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        !notification.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                      role="menuitem"
                    >
                      {/* Icon */}
                      <span
                        className={`material-symbols-outlined mt-0.5 text-[20px] ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !notification.is_read ? "font-semibold" : "font-medium"
                          } text-slate-900 dark:text-white truncate`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-700">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium text-primary hover:bg-primary/5 dark:text-msu-gold dark:hover:bg-primary/10"
            >
              View all notifications
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
