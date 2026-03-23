'use client';

import { authFetch } from "@/lib/utils/authFetch";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import { AdminNotificationProvider } from '@/components/admin/providers/AdminNotificationProvider';
import { Toaster } from 'sonner';
import { useRouter } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminProfile {
  adminId: string;
  profileId: string;
  schoolId: string;
  schoolName: string;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchAdminProfile() {
      if (!user?.id) return;
      try {
        const res = await authFetch('/api/admin/profile');
        if (res.ok) {
          const data = await res.json();
          setAdminProfile({
            adminId: data.adminProfileId || data.adminId || '',
            profileId: data.profileId || '',
            schoolId: data.schoolId || '',
            schoolName: data.schoolName || 'School',
          });
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
      }
    }
    fetchAdminProfile();
  }, [user?.id]);

  const adminName = user?.email?.split('@')[0] || 'Admin';
  const adminRole = user?.role || 'school_admin';
  const schoolName = adminProfile?.schoolName || 'MSU';

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <AdminGuard redirectTo="/login">
      <AdminNotificationProvider
        adminId={adminProfile?.adminId || null}
        profileId={adminProfile?.profileId || null}
        schoolId={adminProfile?.schoolId || null}
      >
        <div className="flex h-screen bg-bg-dark overflow-hidden">
          {/* Sidebar */}
          <AdminSidebar
            adminName={adminName}
            adminRole={adminRole}
            schoolName={schoolName}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content — offset by sidebar width on md+ */}
          <div className="flex flex-1 flex-col md:ml-64 min-w-0">
            {/* Top bar */}
            <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-[#7B1113] shrink-0 gap-3">
              {/* Hamburger + Logo — mobile only */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                  aria-label="Open menu"
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
                <Image src="/brand/logo.png" alt="MSU" width={32} height={32} className="h-8 w-auto object-contain" />
                <span className="text-white font-bold text-sm tracking-wide">MSU</span>
              </div>

              <div className="flex-1" />

              {/* Profile + Logout */}
              <div className="flex items-center gap-2">
                {/* Profile circle */}
                <div className="w-8 h-8 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-white font-bold text-xs shrink-0 select-none">
                  {adminName.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-white/90 truncate max-w-[140px]">
                  {adminName}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isLoggingOut ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                    {isLoggingOut ? 'autorenew' : 'logout'}
                  </span>
                  <span className="hidden sm:block">
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </span>
                </button>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto bg-bg-light">
              <div className="w-full p-4 sm:p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
        {
          // @ts-ignore React type mismatch with sonner
          <Toaster position="top-right" richColors />
        }
      </AdminNotificationProvider>
    </AdminGuard>
  );
}
