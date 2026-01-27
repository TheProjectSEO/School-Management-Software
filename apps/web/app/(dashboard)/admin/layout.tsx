'use client';

import React, { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
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

  // Fetch admin profile data
  useEffect(() => {
    async function fetchAdminProfile() {
      if (!user?.id) return;

      const supabase = createClient();

      try {
        // Get profile ID
        const { data: profile } = await supabase
          .from('school_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!profile) return;

        // Get admin record
        const { data: admin } = await supabase
          .from('admins')
          .select('id, school_id')
          .eq('profile_id', profile.id)
          .single();

        if (admin) {
          // Get school name separately
          const { data: school } = await supabase
            .from('schools')
            .select('name')
            .eq('id', admin.school_id)
            .single();

          setAdminProfile({
            adminId: admin.id,
            profileId: profile.id,
            schoolId: admin.school_id,
            schoolName: school?.name || 'School',
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
        {/* @ts-expect-error Server Component */}
        <Toaster position="top-right" richColors />
      </AdminNotificationProvider>
    </AdminGuard>
  );
}
