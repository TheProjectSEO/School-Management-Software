"use client";

import { useState } from "react";
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
  const { theme, isPlayful } = useStudentTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.name || "Student";

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar user={user} showRealtimeNotifications={!!studentId} />
      <div className="flex flex-1 flex-col min-h-0">
        {/* Mobile nav handles mobile header + drawer */}
        <MobileNav user={user} onLogout={handleLogout} showRealtimeNotifications={!!studentId} />

        {/* Desktop topbar — hidden on mobile (MobileNav covers it) */}
        <header className={`hidden lg:flex items-center justify-between h-14 px-6 border-b border-slate-200 dark:border-slate-700 shrink-0 sticky top-0 z-30 ${isPlayful ? theme.layout.mobileBg : 'bg-white dark:bg-card-dark'}`}>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
              {isPlayful ? `Hi, ${displayName.split(' ')[0]}!` : displayName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                isPlayful
                  ? 'text-purple-600 hover:bg-pink-100 hover:text-pink-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              {isPlayful ? (
                <span className={`text-base leading-none transition-transform duration-300 ${isLoggingOut ? 'animate-bounce' : 'group-hover:animate-bounce'}`}>
                  {'\u{1F44B}'}
                </span>
              ) : (
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isLoggingOut ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                  {isLoggingOut ? 'autorenew' : 'logout'}
                </span>
              )}
              {isLoggingOut ? 'Bye...' : isPlayful ? 'Bye Bye!' : 'Log Out'}
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${theme.layout.contentBg}`}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
