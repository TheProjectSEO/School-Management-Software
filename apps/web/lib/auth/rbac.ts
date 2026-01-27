import { AccessTokenPayload } from './jwt';
import { Permission, Role, ROLE_PERMISSIONS, API_ROUTE_PERMISSIONS } from './permissions';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: AccessTokenPayload | null,
  permission: Permission
): boolean {
  if (!user) return false;

  const role = user.role as Role;
  const rolePermissions = ROLE_PERMISSIONS[role];

  // Super admin has all permissions (rolePermissions is ['*'])
  if (rolePermissions.length === 1 && rolePermissions[0] === '*') {
    return true;
  }

  // Check if permission is in role permissions
  if ((rolePermissions as Permission[]).includes(permission)) {
    return true;
  }

  // Check user-specific permissions from token
  if (user.permissions?.includes(permission)) {
    return true;
  }

  return false;
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  user: AccessTokenPayload | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  user: AccessTokenPayload | null,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Get all permissions for a user (role permissions + user-specific)
 */
export function getUserPermissions(user: AccessTokenPayload | null): Permission[] {
  if (!user) return [];

  const role = user.role as Role;
  const rolePermissions = ROLE_PERMISSIONS[role];

  // Super admin has all permissions (rolePermissions is ['*'])
  if (rolePermissions.length === 1 && rolePermissions[0] === '*') {
    return Object.keys(API_ROUTE_PERMISSIONS).flatMap(
      (route) => Object.values(API_ROUTE_PERMISSIONS[route])
    ) as Permission[];
  }

  // Combine role permissions with user-specific permissions
  const userPermissions = (user.permissions || []) as Permission[];
  const allPermissions = new Set([...(rolePermissions as Permission[]), ...userPermissions]);

  return Array.from(allPermissions) as Permission[];
}

/**
 * Check if user has required role
 */
export function hasRole(user: AccessTokenPayload | null, role: Role): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: AccessTokenPayload | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}

/**
 * Get required permission for an API route and method
 */
export function getRequiredPermission(
  pathname: string,
  method: string
): Permission | null {
  // Normalize pathname (remove trailing slash, query params)
  const normalizedPath = pathname.split('?')[0].replace(/\/$/, '');

  // Check exact match first
  if (API_ROUTE_PERMISSIONS[normalizedPath]?.[method]) {
    return API_ROUTE_PERMISSIONS[normalizedPath][method];
  }

  // Check pattern matches (e.g., /api/admin/users/[id] -> /api/admin/users)
  const pathParts = normalizedPath.split('/');
  while (pathParts.length > 0) {
    const basePath = pathParts.join('/');
    if (API_ROUTE_PERMISSIONS[basePath]?.[method]) {
      return API_ROUTE_PERMISSIONS[basePath][method];
    }
    pathParts.pop();
  }

  return null;
}

/**
 * Get required role for a dashboard route
 */
export function getRequiredRole(pathname: string): Role | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  return null;
}

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/about',
    '/contact',
    '/features',
    '/pricing',
    '/apply',
  ];

  const publicPrefixes = [
    '/_next',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/me',
    '/api/applications',
    '/favicon',
    '/images',
    '/assets',
  ];

  if (publicRoutes.includes(pathname)) return true;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;

  return false;
}

/**
 * Check if a route is an auth route (login, register, etc.)
 */
export function isAuthRoute(pathname: string): boolean {
  const authRoutes = [
    '/login',
    '/register',
    '/teacher-register',
    '/forgot-password',
    '/reset-password',
  ];

  return authRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Get the dashboard path for a role
 */
export function getDashboardPath(role: Role): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/student';
    default:
      return '/';
  }
}
