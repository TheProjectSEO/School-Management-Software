'use client';

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { Role, ROLES } from '@/lib/auth/permissions';
import { UseRoleReturn } from '@/types/rbac';

/**
 * Hook to access and check user role
 */
export function useRole(): UseRoleReturn {
  const { user, isLoading } = useAuth();

  const role = useMemo<Role | null>(() => {
    return user?.role as Role | null;
  }, [user]);

  // Check if user has a specific role
  const isRole = useCallback(
    (checkRole: Role): boolean => {
      if (!role) return false;
      return role === checkRole;
    },
    [role]
  );

  // Check if user has any of the specified roles
  const isAnyRole = useCallback(
    (roles: Role[]): boolean => {
      if (!role) return false;
      return roles.includes(role);
    },
    [role]
  );

  // Convenience booleans
  const isAdmin = useMemo(() => role === ROLES.ADMIN, [role]);
  const isSuperAdmin = useMemo(() => role === ROLES.SUPER_ADMIN, [role]);
  const isTeacher = useMemo(() => role === ROLES.TEACHER, [role]);
  const isStudent = useMemo(() => role === ROLES.STUDENT, [role]);

  return {
    role,
    isRole,
    isAnyRole,
    isAdmin,
    isSuperAdmin,
    isTeacher,
    isStudent,
    isLoading,
  };
}

/**
 * Hook to check if user is admin (admin or super_admin)
 */
export function useIsAdmin(): boolean {
  const { isAdmin, isSuperAdmin, isLoading } = useRole();
  return !isLoading && (isAdmin || isSuperAdmin);
}

/**
 * Hook to check if user is a teacher
 */
export function useIsTeacher(): boolean {
  const { isTeacher, isLoading } = useRole();
  return !isLoading && isTeacher;
}

/**
 * Hook to check if user is a student
 */
export function useIsStudent(): boolean {
  const { isStudent, isLoading } = useRole();
  return !isLoading && isStudent;
}

/**
 * Hook to require a specific role
 * Returns the check result and loading state
 */
export function useRequireRole(requiredRole: Role) {
  const { isRole, isLoading } = useRole();

  return {
    hasRole: isRole(requiredRole),
    isLoading,
  };
}

/**
 * Hook to require any of the specified roles
 */
export function useRequireAnyRole(requiredRoles: Role[]) {
  const { isAnyRole, isLoading } = useRole();

  return {
    hasRole: isAnyRole(requiredRoles),
    isLoading,
  };
}
