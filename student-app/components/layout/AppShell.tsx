"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

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
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Redirect to login page
        window.location.href = "/login";
      } else {
        console.error("Failed to log out");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar user={user} onLogout={handleLogout} showRealtimeNotifications={!!studentId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav user={user} onLogout={handleLogout} showRealtimeNotifications={!!studentId} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
