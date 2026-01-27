'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { usePermissions } from '@/hooks/usePermissions';
import { Role, Permission } from '@/lib/auth/permissions';
import { RoleGuardProps } from '@/types/rbac';
import { getDashboardPath } from '@/lib/auth/rbac';

/**
 * Component that guards content based on role and/or permissions
 */
export function RoleGuard({
  children,
  allowedRoles,
  requiredPermissions,
  requireAll = true,
  fallback = null,
  redirectTo,
}: RoleGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const { hasAllPermissions, hasAnyPermission, isLoading: permLoading } = usePermissions();

  const isLoading = authLoading || roleLoading || permLoading;

  // Show nothing while loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    return <>{fallback}</>;
  }

  // Check role
  if (allowedRoles && allowedRoles.length > 0) {
    // Super admin bypasses role check
    if (role !== 'super_admin' && !allowedRoles.includes(role as Role)) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }

      // Redirect to user's own dashboard
      if (user) {
        router.push(getDashboardPath(user.role as Role));
        return null;
      }

      return <>{fallback}</>;
    }
  }

  // Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasPermission) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      return <>{fallback}</>;
    }
  }

  // All checks passed
  return <>{children}</>;
}

/**
 * Guard for admin-only content
 */
export function AdminGuard({
  children,
  fallback,
  redirectTo,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={['admin', 'super_admin']}
      fallback={fallback}
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * Guard for teacher-only content
 */
export function TeacherGuard({
  children,
  fallback,
  redirectTo,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['teacher']} fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleGuard>
  );
}

/**
 * Guard for student-only content
 */
export function StudentGuard({
  children,
  fallback,
  redirectTo,
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['student']} fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleGuard>
  );
}

/**
 * Guard for authenticated users (any role)
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo = '/login',
}: Omit<RoleGuardProps, 'allowedRoles' | 'requiredPermissions'>) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Guard based on specific permission
 */
export function PermissionGuard({
  children,
  permission,
  fallback,
  redirectTo,
}: {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
  redirectTo?: string;
}) {
  return (
    <RoleGuard
      requiredPermissions={[permission]}
      fallback={fallback}
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}
