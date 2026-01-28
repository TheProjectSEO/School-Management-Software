'use client';

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { Permission, ROLE_PERMISSIONS, Role } from '@/lib/auth/permissions';
import { UsePermissionsReturn } from '@/types/rbac';

/**
 * Hook to access and check user permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, isLoading } = useAuth();

  // Check if user is super admin (has '*' permission)
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
    return rolePermissions.length === 1 && rolePermissions[0] === '*';
  }, [user]);

  // Get all permissions for the user
  const permissions = useMemo<Permission[]>(() => {
    if (!user) return [];

    const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];

    // Super admin - return all known permissions
    if (rolePermissions.length === 1 && rolePermissions[0] === '*') {
      return Object.keys(
        require('@/lib/auth/permissions').PERMISSIONS
      ) as Permission[];
    }

    // Combine role permissions with user-specific permissions
    const userPermissions = (user.permissions || []) as Permission[];
    return [...new Set([...(rolePermissions as Permission[]), ...userPermissions])];
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;

      // Super admin has all permissions
      if (isSuperAdmin) {
        return true;
      }

      return permissions.includes(permission);
    },
    [user, permissions, isSuperAdmin]
  );

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
  };
}

/**
 * Hook to check a single permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission, isLoading } = usePermissions();
  return !isLoading && hasPermission(permission);
}

/**
 * Hook to require specific permissions
 * Returns the check result and loading state
 */
export function useRequirePermissions(
  requiredPermissions: Permission[],
  requireAll = true
) {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  const hasRequired = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  return {
    hasPermission: hasRequired,
    isLoading,
  };
}
