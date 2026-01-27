'use client';

import React from 'react';
import { StudentGuard } from '@/components/auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/student/layout/AppShell';
import { RealtimeProvider } from '@/components/student/providers/RealtimeProvider';
import { MessageNotificationProvider } from '@/components/student/providers/MessageNotificationProvider';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user } = useAuth();

  // Convert auth user to the format expected by AppShell
  const appShellUser = user ? {
    name: user.email?.split('@')[0] || 'Student',
    role: user.role || 'student',
    avatar: undefined,
  } : undefined;

  // Get profileId and studentId for providers
  // For students, profileId is the same as the user's profileId from auth
  const profileId = user?.profileId || null;
  // For the student app, we use profileId as studentId since that's the student record ID
  const studentId = user?.profileId || null;

  return (
    <StudentGuard redirectTo="/login">
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
    </StudentGuard>
  );
}
