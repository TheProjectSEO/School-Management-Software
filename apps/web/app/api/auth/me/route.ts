import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/session';
import { getDashboardPath } from '@/lib/auth/rbac';
import { Role } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    // Try to get user from headers first (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const userProfileId = request.headers.get('x-user-profile-id');
    const userSchoolId = request.headers.get('x-user-school-id');
    const userPermissions = request.headers.get('x-user-permissions');

    // If headers are present (middleware ran), use them
    if (userId && userEmail && userRole) {
      return NextResponse.json({
        user: {
          id: userId,
          email: userEmail,
          role: userRole,
          profileId: userProfileId,
          schoolId: userSchoolId || null,
          permissions: userPermissions ? JSON.parse(userPermissions) : [],
        },
        isAuthenticated: true,
        redirectTo: getDashboardPath(userRole as Role),
      });
    }

    // Fallback: verify token directly
    const token = await getAccessToken();

    if (!token) {
      return NextResponse.json({
        user: null,
        isAuthenticated: false,
      });
    }

    const payload = await verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json({
        user: null,
        isAuthenticated: false,
      });
    }

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        profileId: payload.profile_id,
        schoolId: payload.school_id || null,
        permissions: payload.permissions,
      },
      isAuthenticated: true,
      redirectTo: getDashboardPath(payload.role as Role),
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({
      user: null,
      isAuthenticated: false,
    });
  }
}
