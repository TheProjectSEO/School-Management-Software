"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";
import { useLiveSession } from "@/contexts/LiveSessionContext";
import { FloatingVideoPanel } from "@/components/live-sessions/FloatingVideoPanel";

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
  const { session, isFloating, setFloating, clearSession } = useLiveSession();

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
        <header className={`hidden lg:flex items-center justify-between h-14 px-6 shrink-0 sticky top-0 z-30 ${isPlayful ? `${theme.layout.mobileBg} border-b border-slate-200 dark:border-slate-700` : 'bg-[#7B1113]'}`}>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Avatar */}
            {user?.avatar ? (
              <div className={`w-8 h-8 rounded-full overflow-hidden border shrink-0 ${isPlayful ? 'border-pink-300' : 'border-white/40'}`}>
                <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${isPlayful ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-white/25 border border-white/40 text-white'}`}>
                {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'}
              </div>
            )}
            <span className={`text-sm font-medium truncate max-w-[160px] ${isPlayful ? 'text-slate-600 dark:text-slate-300' : 'text-white/90'}`}>
              {isPlayful ? `Hi, ${displayName.split(' ')[0]}!` : displayName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                isPlayful
                  ? 'text-purple-600 hover:bg-pink-100 hover:text-pink-700'
                  : 'text-white/90 hover:text-white hover:bg-white/20'
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
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      {isFloating && session && (
        <FloatingVideoPanel
          roomUrl={session.roomUrl}
          token={session.token}
          title={session.title}
          onExpand={() => setFloating(false)}
          onClose={clearSession}
        />
      )}
    </div>
  );
}
