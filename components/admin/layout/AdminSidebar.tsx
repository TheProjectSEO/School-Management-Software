"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAdminNotifications } from "@/components/admin/providers/AdminNotificationProvider";

interface AdminSidebarProps {
  adminName: string;
  adminRole: string;
  schoolName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badgeKey?: "messages" | "applications";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", icon: "dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "User Management",
    items: [
      { href: "/admin/users/students", icon: "school", label: "Students" },
      { href: "/admin/users/teachers", icon: "person", label: "Teachers" },
      { href: "/admin/users/import", icon: "upload_file", label: "Bulk Import" },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/admin/messages", icon: "chat_bubble", label: "Messages", badgeKey: "messages" },
    ],
  },
  {
    title: "Academics",
    items: [
      { href: "/admin/courses", icon: "menu_book", label: "Courses" },
      { href: "/admin/sections", icon: "groups", label: "Sections" },
      { href: "/admin/applications", icon: "description", label: "Applications", badgeKey: "applications" },
      { href: "/admin/enrollment-qr", icon: "qr_code", label: "Enrollment QR" },
      { href: "/admin/enrollments", icon: "assignment_ind", label: "Enrollments" },
      { href: "/admin/enrollments/bulk", icon: "group_add", label: "Bulk Enrollment" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/finance/setup", icon: "settings", label: "Fee Setup" },
      { href: "/admin/finance/accounts", icon: "account_balance_wallet", label: "Student Accounts" },
      { href: "/admin/finance/payments", icon: "payments", label: "Record Payment" },
      { href: "/admin/finance/collection", icon: "auto_awesome", label: "AI Collection" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/admin/reports/attendance", icon: "event_available", label: "Attendance" },
      { href: "/admin/reports/grades", icon: "grade", label: "Grades" },
      { href: "/admin/reports/progress", icon: "trending_up", label: "Progress" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/settings/school", icon: "domain", label: "School Settings" },
      { href: "/admin/settings/academic", icon: "calendar_month", label: "Academic Settings" },
      { href: "/admin/audit-logs", icon: "history", label: "Audit Logs" },
    ],
  },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  registrar: "Registrar",
  support: "Support Staff",
};

export default function AdminSidebar({ adminName, adminRole, schoolName, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { unreadMessageCount, pendingApplicationsCount, isConnected } = useAdminNotifications();

  const getBadgeCount = (key?: "messages" | "applications"): number | undefined => {
    if (!key) return undefined;
    if (key === "messages") return unreadMessageCount > 0 ? unreadMessageCount : undefined;
    if (key === "applications") return pendingApplicationsCount > 0 ? pendingApplicationsCount : undefined;
    return undefined;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-[#101822] text-white flex flex-col transition-transform duration-300",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-[#7B1113] rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">
                  admin_panel_settings
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-lg leading-tight">Admin Portal</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400 truncate">{schoolName}</p>
                  <div
                    className={clsx(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      isConnected ? "bg-green-500" : "bg-yellow-500"
                    )}
                    title={isConnected ? "Connected" : "Connecting..."}
                  />
                </div>
              </div>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Navigation — scrollbar hidden */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-6 px-3">
            {navGroups.map((group) => (
              <div key={group.title}>
                <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                    const badge = getBadgeCount(item.badgeKey);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={clsx(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors relative",
                            isActive
                              ? "bg-[#7B1113] text-white"
                              : "text-gray-300 hover:bg-white/10"
                          )}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {item.icon}
                          </span>
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {badge && badge > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7B1113] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold">
                {adminName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{adminName}</p>
              <p className="text-xs text-gray-400">{roleLabels[adminRole] || adminRole}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
