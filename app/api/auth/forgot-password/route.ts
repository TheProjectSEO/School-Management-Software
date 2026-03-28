import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rateLimit';
import { sendPasswordResetEmail } from '@/lib/notifications/email';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Rate limit: 3 requests per 15 min per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const admin = createAdminClient();

  // Look up the user by email without triggering Supabase's own email pipeline.
  // generateLink({ type: 'recovery' }) internally sends a Supabase email and
  // counts against Supabase's email rate limit — avoid it.
  const { data } = await admin.auth.admin.listUsers();
  const user = data?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (user) {
    const secret = getJwtSecret();
    const resetToken = await new SignJWT({
      sub: user.id,
      purpose: 'password_reset',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(email, resetUrl);
  }

  // Always return success to avoid email enumeration
  return NextResponse.json({ success: true });
}
