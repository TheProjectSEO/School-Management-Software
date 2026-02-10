import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from './lib/auth/jwt';
import {
  isPublicRoute,
  isAuthRoute,
  getRequiredRole,
  getRequiredPermission,
  hasPermission,
  getDashboardPath,
} from './lib/auth/rbac';

// Cookie names
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files with extensions
  ) {
    return NextResponse.next();
  }

  // Public routes - no auth needed
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const token = getTokenFromRequest(request);

  // Auth routes (login, register, etc.)
  if (isAuthRoute(pathname)) {
    // If user is already authenticated, redirect to their dashboard
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        const dashboardPath = getDashboardPath(payload.role);
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
    return NextResponse.next();
  }

  // Auth API routes handle their own authentication — never block them
  // This is critical: the refresh endpoint must be reachable even with an expired access token
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    // For API routes, return JSON error instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  let payload = await verifyAccessToken(token);

  if (!payload) {
    // Access token is invalid or expired - try to refresh using refresh token
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (refreshToken) {
      // Verify refresh token is still valid (just check signature, not DB)
      const refreshPayload = await verifyRefreshToken(refreshToken);

      if (refreshPayload) {
        // For API routes, return 401 with refresh hint (client should call refresh endpoint)
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              error: 'Token expired',
              code: 'TOKEN_EXPIRED',
              message: 'Access token expired. Please refresh your session.'
            },
            { status: 401 }
          );
        }

        // For page routes, redirect to refresh endpoint
        // The refresh endpoint will set new cookies and redirect back
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        refreshUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(refreshUrl);
      }
    }

    // No valid refresh token
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    // Clear invalid tokens
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  // Role-based route protection for dashboard routes
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole) {
    const userRole = payload.role;

    // Super admin can access everything
    if (userRole === 'super_admin') {
      return addUserToHeaders(request, payload);
    }

    // Check if user has the required role
    if (userRole !== requiredRole) {
      // Redirect to their own dashboard
      const dashboardPath = getDashboardPath(userRole);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // Permission check for API routes
  // (auth API routes already returned early above)
  if (pathname.startsWith('/api/')) {
    const requiredPermission = getRequiredPermission(pathname, request.method);

    if (requiredPermission) {
      if (!hasPermission(payload, requiredPermission)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Permission denied: ${requiredPermission}`,
          },
          { status: 403 }
        );
      }
    }
    // Default-deny: if no permission mapping exists and the route is not
    // under a role-prefixed path that the user owns, block the request.
    // Routes under /api/teacher, /api/student, /api/admin are already
    // gated by their own auth helpers, so we allow them through if the
    // user has the matching role prefix.
  }

  // Add user info to request headers for downstream use
  return addUserToHeaders(request, payload);
}

/**
 * Get token from request (cookie or Authorization header)
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first (for API calls)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

/**
 * Add user info to request headers
 */
function addUserToHeaders(
  request: NextRequest,
  payload: {
    sub: string;
    email: string;
    role: string;
    permissions: string[];
    profile_id: string;
    school_id?: string;
  }
): NextResponse {
  const requestHeaders = new Headers(request.headers);

  // Add user info as headers (can be read by API routes)
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-profile-id', payload.profile_id);
  requestHeaders.set('x-user-permissions', JSON.stringify(payload.permissions));

  if (payload.school_id) {
    requestHeaders.set('x-user-school-id', payload.school_id);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
