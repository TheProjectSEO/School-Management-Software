'use client';

import React, { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import { AdminNotificationProvider } from '@/components/admin/providers/AdminNotificationProvider';
import { Toaster } from 'sonner';

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
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // Fetch admin profile data via API (avoids RLS issues with browser client)
  useEffect(() => {
    async function fetchAdminProfile() {
      if (!user?.id) return;

      try {
        const res = await fetch('/api/admin/profile');
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

  // Extract display name from user email or profile
  const adminName = user?.email?.split('@')[0] || 'Admin';
  const adminRole = user?.role || 'school_admin';
  const schoolName = adminProfile?.schoolName || 'MSU';

  return (
    <AdminGuard redirectTo="/login">
      <AdminNotificationProvider
        adminId={adminProfile?.adminId || null}
        profileId={adminProfile?.profileId || null}
        schoolId={adminProfile?.schoolId || null}
      >
        <div className="flex h-screen bg-bg-dark">
          {/* Sidebar */}
          <AdminSidebar
            adminName={adminName}
            adminRole={adminRole}
            schoolName={schoolName}
          />

          {/* Main content */}
          <main className="flex-1 ml-64 overflow-auto bg-bg-light p-6">
            {children}
          </main>
        </div>
        {
          // @ts-ignore React type mismatch with sonner
          <Toaster position="top-right" richColors />
        }
      </AdminNotificationProvider>
    </AdminGuard>
  );
}
