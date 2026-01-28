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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client for authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Log failed login attempt
      await logAuthEvent(
        null,
        'login_failed',
        { email, reason: authError?.message },
        request.headers.get('user-agent') || undefined,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Get user role and profile
    const roleData = await getUserRole(userId);

    if (!roleData) {
      return NextResponse.json(
        { error: 'User account not properly configured. Please contact support.' },
        { status: 403 }
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
      email: authData.user.email!,
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
      { role: roleData.role },
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // Return user data and redirect path
    return NextResponse.json({
      user: {
        id: userId,
        email: authData.user.email,
        role: roleData.role,
        profileId: roleData.profileId,
        schoolId: roleData.schoolId,
      },
      redirectTo: getDashboardPath(roleData.role as Role),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
