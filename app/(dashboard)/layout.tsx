'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/RoleGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard redirectTo="/login">
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    </AuthGuard>
  );
}
