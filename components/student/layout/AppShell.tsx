"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  studentId?: string | null;
}

export function AppShell({ children, user, studentId }: AppShellProps) {
  const { logout } = useAuth();
  const { theme } = useStudentTheme();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar user={user} onLogout={logout} showRealtimeNotifications={!!studentId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav user={user} onLogout={logout} showRealtimeNotifications={!!studentId} />
        <main className={`flex-1 overflow-y-auto ${theme.layout.contentBg}`}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
