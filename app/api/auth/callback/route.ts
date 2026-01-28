import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { ROLE_PERMISSIONS, Permission, Role } from '@/lib/auth/permissions';
import {
  getUserRole,
  storeRefreshToken,
  logAuthEvent,
  getUserPermissionOverrides,
} from '@/lib/supabase/admin';
import { setAuthCookies } from '@/lib/auth/session';
import { getDashboardPath } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=No authorization code provided', requestUrl.origin)
    );
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.user) {
      console.error('Session exchange error:', sessionError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(sessionError?.message || 'Failed to authenticate')}`, requestUrl.origin)
      );
    }

    const user = sessionData.user;
    const userId = user.id;

    // Get user role from database
    const roleData = await getUserRole(userId);

    if (!roleData) {
      // User authenticated but no role assigned yet
      // This could be a new OAuth user - redirect to a role selection page
      // Or create a default student role

      // For now, redirect with a message
      return NextResponse.redirect(
        new URL('/login?error=Account not configured. Please contact support or use email login to register first.', requestUrl.origin)
      );
    }

    // Get base permissions for role
    const basePermissions = ROLE_PERMISSIONS[roleData.role as Role];
    let permissions: string[];

    // Check if super admin (has wildcard permission)
    if (basePermissions.length === 1 && basePermissions[0] === '*') {
      permissions = ['*'];
    } else {
      // Get any custom permission overrides
      const overrides = await getUserPermissionOverrides(userId);
      permissions = [...new Set([...(basePermissions as Permission[]), ...overrides])];
    }

    // Generate tokens
    const accessToken = await generateAccessToken({
      sub: userId,
      email: user.email!,
      role: roleData.role,
      permissions,
      profile_id: roleData.profileId,
      school_id: roleData.schoolId,
    });

    // Generate refresh token with unique ID
    const refreshTokenId = randomUUID();
    const refreshToken = await generateRefreshToken(userId, refreshTokenId);

    // Hash refresh token for storage
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token
    await storeRefreshToken(
      userId,
      tokenHash,
      expiresAt,
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Log successful login
    await logAuthEvent(
      userId,
      'login',
      { role: roleData.role, provider: 'google' },
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // Redirect to appropriate dashboard
    const redirectPath = getDashboardPath(roleData.role as Role);
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=An unexpected error occurred during authentication', requestUrl.origin)
    );
  }
}
