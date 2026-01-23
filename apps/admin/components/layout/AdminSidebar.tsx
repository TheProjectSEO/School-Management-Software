"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
  adminName: string;
  adminRole: string;
  schoolName: string;
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const getNavGroups = (unreadCount: number): NavGroup[] => [
  {
    title: "Overview",
    items: [
      { href: "/", icon: "dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "User Management",
    items: [
      { href: "/users/students", icon: "school", label: "Students" },
      { href: "/users/teachers", icon: "person", label: "Teachers" },
      { href: "/users/import", icon: "upload_file", label: "Bulk Import" },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/messages", icon: "chat_bubble", label: "Messages", badge: unreadCount > 0 ? unreadCount : undefined },
    ],
  },
  {
    title: "Academics",
    items: [
      { href: "/applications", icon: "description", label: "Applications" },
      { href: "/enrollment-qr", icon: "qr_code", label: "Enrollment QR" },
      { href: "/enrollments", icon: "assignment_ind", label: "Enrollments" },
      { href: "/enrollments/bulk", icon: "group_add", label: "Bulk Enrollment" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/finance/setup", icon: "settings", label: "Fee Setup" },
      { href: "/finance/accounts", icon: "account_balance_wallet", label: "Student Accounts" },
      { href: "/finance/payments", icon: "payments", label: "Record Payment" },
      { href: "/finance/collection", icon: "auto_awesome", label: "AI Collection" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/attendance", icon: "event_available", label: "Attendance" },
      { href: "/reports/grades", icon: "grade", label: "Grades" },
      { href: "/reports/progress", icon: "trending_up", label: "Progress" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/settings/school", icon: "domain", label: "School Settings" },
      { href: "/settings/academic", icon: "calendar_month", label: "Academic Settings" },
      { href: "/audit-logs", icon: "history", label: "Audit Logs" },
    ],
  },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  registrar: "Registrar",
  support: "Support Staff",
};

export default function AdminSidebar({ adminName, adminRole, schoolName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch unread message count
    async function fetchUnreadCount() {
      try {
        const response = await fetch("/api/messages/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    }

    fetchUnreadCount();

    // Poll every 30 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#101822] text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7B1113] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white">
              admin_panel_settings
            </span>
          </div>
          <div>
            <h1 className="font-bold text-lg">Admin Portal</h1>
            <p className="text-xs text-gray-400">{schoolName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-6 px-3">
          {getNavGroups(unreadCount).map((group) => (
            <div key={group.title}>
              <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
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
                        {item.badge && item.badge > 0 && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {item.badge > 99 ? "99+" : item.badge}
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#7B1113] rounded-full flex items-center justify-center">
            <span className="text-white font-bold">
              {adminName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{adminName}</p>
            <p className="text-xs text-gray-400">{roleLabels[adminRole] || adminRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
