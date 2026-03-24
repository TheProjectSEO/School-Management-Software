import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rateLimit';
import { ROLE_PERMISSIONS, Permission, Role } from '@/lib/auth/permissions';
import {
  getUserRole,
  getUserEmail,
  verifyStoredRefreshToken,
  revokeRefreshToken,
  storeRefreshToken,
  logAuthEvent,
  getUserPermissionOverrides,
} from '@/lib/supabase/admin';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth/session';
import { getDashboardPath } from '@/lib/auth/rbac';

// Cookie name for refresh token
const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Helper function to perform token refresh
 */
async function performTokenRefresh(request: NextRequest, refreshToken: string) {
  // Verify JWT signature and expiry
  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    return { error: 'Invalid or expired refresh token', status: 401 };
  }

  // Hash token to verify against database
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

  // Verify token exists in database and is not revoked
  const storedToken = await verifyStoredRefreshToken(tokenHash);

  if (!storedToken) {
    return { error: 'Refresh token has been revoked', status: 401 };
  }

  const userId = storedToken.userId;
  const oldTokenId = storedToken.id;

  // Get fresh user data (parallel — do this BEFORE revoking old token)
  const [roleData, email] = await Promise.all([
    getUserRole(userId),
    getUserEmail(userId),
  ]);

  if (!roleData) {
    return { error: 'User account no longer exists', status: 401 };
  }

  if (!email) {
    return { error: 'User account no longer exists', status: 401 };
  }

  // Get permissions

  const basePermissions = ROLE_PERMISSIONS[roleData.role as Role];
  let permissions: string[];

  if (basePermissions.length === 1 && basePermissions[0] === '*') {
    permissions = ['*'];
  } else {
    const overrides = await getUserPermissionOverrides(userId);
    permissions = [...new Set([...(basePermissions as Permission[]), ...overrides])];
  }

  // Generate new access token
  const newAccessToken = await generateAccessToken({
    sub: userId,
    email,
    role: roleData.role,
    permissions,
    profile_id: roleData.profileId,
    school_id: roleData.schoolId,
  });

  // Generate new refresh token (rotation)
  const newRefreshTokenId = randomUUID();
  const newRefreshToken = await generateRefreshToken(userId, newRefreshTokenId);

  // Hash and store new refresh token FIRST (before revoking old)
  // This prevents logout if DB times out between revoke and store
  const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await storeRefreshToken(
    userId,
    newTokenHash,
    expiresAt,
    request.headers.get('user-agent') || undefined,
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  );

  // Revoke old token AFTER new one is safely stored (token rotation)
  await revokeRefreshToken(oldTokenId);

  // Log token refresh (fire-and-forget — do not await in critical path)
  logAuthEvent(
    userId,
    'token_refresh',
    undefined,
    request.headers.get('user-agent') || undefined,
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  ).catch((err) => console.error('logAuthEvent failed (non-critical):', err));

  return {
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: userId,
      email,
      role: roleData.role,
      profileId: roleData.profileId,
      schoolId: roleData.schoolId,
    },
  };
}

/**
 * GET handler - used by middleware to refresh tokens and redirect back
 */
export async function GET(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';

    if (!refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(loginUrl);
    }

    const result = await performTokenRefresh(request, refreshToken);

    if ('error' in result) {
      await clearAuthCookies();
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(loginUrl);
    }

    // Set new cookies and redirect back to original page
    await setAuthCookies(result.accessToken, result.refreshToken);

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Token refresh GET error (transient):', error);
    // Transient error (DB timeout, network blip) — do NOT log the user out.
    // Redirect back to the original page; cookies are unchanged so the
    // middleware will retry the refresh on the next navigation.
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
}

/**
 * POST handler - used by client-side code to refresh tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 refreshes per 15 min per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`refresh:${ip}`, 30, 15 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    const result = await performTokenRefresh(request, refreshToken);

    if ('error' in result) {
      // Only clear cookies for hard auth failures (invalid JWT, user deleted).
      // Do NOT clear on "token revoked" — another tab may have just rotated
      // the token and placed new valid cookies; clearing would log out all tabs.
      const isHardFailure =
        result.error !== 'Refresh token has been revoked' &&
        result.error !== 'Invalid or expired refresh token';
      if (isHardFailure) {
        await clearAuthCookies();
      }
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Set new cookies
    await setAuthCookies(result.accessToken, result.refreshToken);

    return NextResponse.json({
      user: result.user,
      redirectTo: getDashboardPath(result.user.role as Role),
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    // Do NOT clear auth cookies on unexpected errors (network timeout, DB error, etc.)
    // Only clear on explicit auth failures (handled above in the 'error' in result branch)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
