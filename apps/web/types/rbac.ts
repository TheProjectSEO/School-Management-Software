import { Role, Permission } from '@/lib/auth/permissions';

/**
 * Route protection configuration
 */
export interface RouteConfig {
  path: string;
  roles?: Role[];
  permissions?: Permission[];
  isPublic?: boolean;
  isAuthRoute?: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  missingPermissions?: Permission[];
  reason?: string;
}

/**
 * Role guard props
 */
export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Permission hook return type
 */
export interface UsePermissionsReturn {
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isLoading: boolean;
}

/**
 * Role hook return type
 */
export interface UseRoleReturn {
  role: Role | null;
  isRole: (role: Role) => boolean;
  isAnyRole: (roles: Role[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isLoading: boolean;
}

/**
 * Protected route wrapper props
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * API permission middleware options
 */
export interface ApiPermissionOptions {
  requiredPermission?: Permission;
  requiredRole?: Role;
  allowedRoles?: Role[];
}
