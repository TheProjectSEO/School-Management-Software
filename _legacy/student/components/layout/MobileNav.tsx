"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import { useMessageNotifications } from "@/components/providers/MessageNotificationProvider";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  useRealtimeBadge?: boolean;
  useMessageBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/subjects", icon: "book_2", label: "My Subjects" },
  { href: "/live-sessions", icon: "videocam", label: "Live Sessions" },
  { href: "/assessments", icon: "quiz", label: "Assessments" },
  { href: "/grades", icon: "grade", label: "Grades" },
  { href: "/attendance", icon: "event_available", label: "Attendance" },
  { href: "/progress", icon: "bar_chart", label: "Progress" },
  { href: "/notes", icon: "sticky_note_2", label: "Notes" },
  { href: "/ask-ai", icon: "smart_toy", label: "Ask AI" },
  { href: "/downloads", icon: "download", label: "Downloads" },
  { href: "/messages", icon: "chat", label: "Messages", useMessageBadge: true },
  { href: "/announcements", icon: "campaign", label: "Announcements" },
  { href: "/notifications", icon: "notifications", label: "Notifications", useRealtimeBadge: true },
  { href: "/profile", icon: "person", label: "Profile" },
  { href: "/help", icon: "help", label: "Help" },
];

interface MobileNavProps {
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  showRealtimeNotifications?: boolean;
}

export function MobileNav({ user, onLogout, showRealtimeNotifications }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Get realtime notification count - always call the hook (within RealtimeProvider)
  const { unreadCount: realtimeUnreadCount } = useRealtime();
  const { unreadCount: messageUnreadCount } = useMessageNotifications();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-white dark:bg-[#1a2634] dark:border-slate-700 lg:hidden">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <span className="text-sm font-bold text-primary">MSU</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <span className="material-symbols-outlined">
            {isOpen ? "close" : "menu"}
          </span>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1a2634] p-4 overflow-y-auto">
            <div className="flex flex-col gap-6">
              {/* Logo Section */}
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <BrandLogo size="lg" className="mb-3" />
                <div className="text-center">
                  <h1 className="text-xs font-bold tracking-widest text-primary uppercase leading-tight">
                    Mindanao State<br />University
                  </h1>
                </div>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 px-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                {user?.avatar ? (
                  <div
                    className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shrink-0 border border-slate-200"
                    style={{
                      backgroundImage: `url("${user.avatar}")`,
                    }}
                    aria-label={`${user?.name || "Student"}'s avatar`}
                  />
                ) : (
                  <div className="flex items-center justify-center rounded-full h-10 w-10 shrink-0 border border-slate-200 bg-primary/10 text-primary font-semibold text-sm">
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "ST"}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <h1 className="text-sm font-bold leading-normal truncate text-slate-900 dark:text-white">
                    {user?.name || "Student"}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal truncate">
                    {user?.role || "Student"}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary border border-primary/10"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:text-primary dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.useRealtimeBadge && realtimeUnreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-msu-gold text-[10px] font-bold text-black shadow-sm px-1">
                        {realtimeUnreadCount > 99 ? "99+" : realtimeUnreadCount}
                      </span>
                    )}
                    {item.useMessageBadge && messageUnreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm px-1">
                        {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-primary dark:hover:bg-slate-800 transition-colors mt-4"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
