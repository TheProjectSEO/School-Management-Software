"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/student/brand/BrandLogo";
import { useRealtime } from "@/components/student/providers/RealtimeProvider";
import { useMessageNotifications } from "@/components/student/providers/MessageNotificationProvider";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  useRealtimeBadge?: boolean;
  useMessageBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: "/student", icon: "dashboard", label: "Dashboard" },
  { href: "/student/subjects", icon: "book_2", label: "My Subjects" },
  { href: "/student/live-sessions", icon: "videocam", label: "Live Sessions" },
  { href: "/student/assessments", icon: "quiz", label: "Assessments" },
  { href: "/student/grades", icon: "grade", label: "Grades" },
  { href: "/student/attendance", icon: "event_available", label: "Attendance" },
  { href: "/student/progress", icon: "bar_chart", label: "Progress" },
  { href: "/student/notes", icon: "sticky_note_2", label: "Notes" },
  { href: "/student/ask-ai", icon: "smart_toy", label: "Ask AI" },
  { href: "/student/downloads", icon: "download", label: "Downloads" },
  { href: "/student/messages", icon: "chat", label: "Messages", useMessageBadge: true },
  { href: "/student/announcements", icon: "campaign", label: "Announcements" },
  { href: "/student/notifications", icon: "notifications", label: "Notifications", useRealtimeBadge: true },
  { href: "/student/profile", icon: "person", label: "Profile" },
  { href: "/student/help", icon: "help", label: "Help" },
];

interface SidebarProps {
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  showRealtimeNotifications?: boolean;
}

export function Sidebar({ user, showRealtimeNotifications }: SidebarProps) {
  const pathname = usePathname();
  const { theme, isPlayful } = useStudentTheme();

  // Get realtime notification count - always call the hook (within RealtimeProvider)
  const { unreadCount: realtimeUnreadCount } = useRealtime();

  // Get unread message count
  const { unreadCount: messageUnreadCount } = useMessageNotifications();

  const isActive = (href: string) => {
    if (href === "/student") {
      return pathname === "/student";
    }
    return pathname.startsWith(href);
  };

  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <aside className={`hidden w-64 flex-col border-r border-slate-200 dark:border-slate-700 lg:flex ${theme.layout.sidebarBg}`}>
      <div className="flex h-full flex-col p-4">
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Logo Section */}
          <div className="flex flex-col items-center pt-2 pb-2">
            <BrandLogo size="lg" className="mb-3" priority />
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
              <div className={`flex items-center justify-center rounded-full h-10 w-10 shrink-0 border ${isPlayful ? 'border-pink-300 bg-pink-100 text-pink-700' : 'border-slate-200 bg-primary/10 text-primary'} font-semibold text-sm`}>
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
              <h1 className={`text-sm font-bold leading-normal truncate ${theme.layout.headingColor}`}>
                {isPlayful ? `Hi, ${firstName}!` : (user?.name || "Student")}
              </h1>
              <p className={`text-xs font-normal leading-normal truncate ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
                {isPlayful ? '\u{1F31F} Super Student' : (user?.role || "Student")}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 flex-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const navOverride = theme.nav.items[item.href];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 ${theme.nav.itemPadding} ${theme.nav.itemRadius} transition-colors ${
                    active
                      ? `${theme.layout.sidebarActiveItemBg} ${theme.layout.sidebarActiveItemText} ${theme.layout.sidebarActiveItemBorder}`
                      : `${theme.layout.sidebarText} ${theme.layout.sidebarHoverBg}`
                  }`}
                >
                  {theme.nav.useEmoji && navOverride ? (
                    <span className="text-xl leading-none w-6 text-center">{navOverride.emoji}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  )}
                  <span className={`${theme.nav.fontSize} ${theme.nav.fontWeight}`}>
                    {theme.nav.useEmoji && navOverride ? navOverride.label : item.label}
                  </span>
                  {item.useRealtimeBadge && realtimeUnreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-msu-gold text-[10px] font-bold text-black shadow-sm px-1">
                      {realtimeUnreadCount > 99 ? "99+" : realtimeUnreadCount}
                    </span>
                  )}
                  {item.useMessageBadge && messageUnreadCount > 0 && (
                    <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm px-1 ${isPlayful ? 'bg-pink-500 text-white' : 'bg-primary text-white'}`}>
                      {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

      </div>
    </aside>
  );
}
