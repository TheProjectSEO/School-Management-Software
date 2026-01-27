import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { AccessTokenPayload, verifyAccessToken, verifyRefreshToken } from './jwt';

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Set authentication cookies
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();

  // Access token - short lived (15 minutes)
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes in seconds
  });

  // Refresh token - long lived (7 days)
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

/**
 * Get access token from cookies (server component)
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

/**
 * Get refresh token from cookies (server component)
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
}

/**
 * Get access token from request (middleware)
 */
export function getAccessTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

/**
 * Get refresh token from request (middleware)
 */
export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(REFRESH_TOKEN_COOKIE)?.value || null;
}

/**
 * Get current user from cookies (server component)
 */
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Get current user from request (middleware)
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<AccessTokenPayload | null> {
  const token = getAccessTokenFromRequest(request);
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Check if refresh token is valid
 */
export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const payload = await verifyRefreshToken(token);
  return payload !== null;
}

/**
 * Session data structure for client
 */
export interface SessionData {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    profileId: string;
    schoolId?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Create session data from token payload
 */
export function createSessionData(payload: AccessTokenPayload | null): SessionData {
  if (!payload) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      profileId: payload.profile_id,
      schoolId: payload.school_id,
    },
    isAuthenticated: true,
    isLoading: false,
  };
}
