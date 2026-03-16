import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookies } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, revokeAllUserTokens, logAuthEvent } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
  }

  // Verify current password via Supabase signInWithPassword
  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  // Update password via admin SDK
  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.sub, {
    password: newPassword,
  });
  if (updateError) {
    console.error('Failed to update password:', updateError);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }

  // Revoke all sessions and clear cookies
  await revokeAllUserTokens(user.sub);
  await logAuthEvent(user.sub, 'logout', { reason: 'password_changed' });
  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
