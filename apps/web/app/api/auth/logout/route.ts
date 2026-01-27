import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { verifyRefreshToken } from '@/lib/auth/jwt';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/session';
import { revokeRefreshToken, verifyStoredRefreshToken, logAuthEvent } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from header (set by middleware)
    const userId = request.headers.get('x-user-id');

    // Get refresh token to revoke
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      // Verify and decode refresh token
      const payload = await verifyRefreshToken(refreshToken);

      if (payload) {
        // Hash token to find in database
        const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

        // Verify token exists in database
        const storedToken = await verifyStoredRefreshToken(tokenHash);

        if (storedToken) {
          // Revoke the refresh token
          await revokeRefreshToken(storedToken.id);
        }
      }
    }

    // Log logout event
    if (userId) {
      await logAuthEvent(
        userId,
        'logout',
        undefined,
        request.headers.get('user-agent') || undefined,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      );
    }

    // Clear auth cookies
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);

    // Even if there's an error, clear cookies
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  }
}
