'use client';

import React, { useState, useEffect } from 'react';
import { StudentGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/student/layout/AppShell';
import { RealtimeProvider } from '@/components/student/providers/RealtimeProvider';
import { MessageNotificationProvider } from '@/components/student/providers/MessageNotificationProvider';
import { StudentThemeProvider } from '@/components/student/providers/StudentThemeProvider';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<{ full_name: string; avatar_url: string | null; grade_level: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch('/api/student/profile')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data) setProfileData(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user]);

  // Convert auth user to the format expected by AppShell
  const appShellUser = user ? {
    name: profileData?.full_name || user.email?.split('@')[0] || 'Student',
    role: user.role || 'student',
    avatar: profileData?.avatar_url || undefined,
  } : undefined;

  // Get profileId and studentId for providers
  // For students, profileId is the same as the user's profileId from auth
  const profileId = user?.profileId || null;
  // For the student app, we use profileId as studentId since that's the student record ID
  const studentId = user?.profileId || null;

  return (
    <StudentGuard redirectTo="/login">
      <StudentThemeProvider gradeLevel={profileData?.grade_level}>
        <RealtimeProvider initialStudentId={studentId}>
          <MessageNotificationProvider
            profileId={profileId}
            studentId={studentId}
            userName={appShellUser?.name}
          >
            <AppShell user={appShellUser} studentId={studentId}>
              {children}
            </AppShell>
          </MessageNotificationProvider>
        </RealtimeProvider>
      </StudentThemeProvider>
    </StudentGuard>
  );
}
