import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookies } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, revokeAllUserTokens, logAuthEvent } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { currentPassword, newEmail } = body;

  if (!currentPassword || !newEmail) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'New email is the same as your current email' }, { status: 400 });
  }

  // Verify current password
  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  // Check uniqueness in school_profiles
  const serviceClient = createServiceClient();
  const { data: existing } = await serviceClient
    .from('school_profiles')
    .select('id')
    .eq('email', newEmail.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Email is already registered to another account' }, { status: 409 });
  }

  // Update auth.users
  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.sub, {
    email: newEmail.toLowerCase(),
  });
  if (updateError) {
    if (updateError.message?.includes('already been registered')) {
      return NextResponse.json({ error: 'Email is already registered to another account' }, { status: 409 });
    }
    console.error('Failed to update email:', updateError);
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }

  // Update school_profiles (best effort)
  const { error: profileError } = await serviceClient
    .from('school_profiles')
    .update({ email: newEmail.toLowerCase(), updated_at: new Date().toISOString() })
    .eq('auth_user_id', user.sub);

  if (profileError) {
    console.error('Failed to update school_profiles email (non-fatal):', profileError);
  }

  // Revoke all sessions and clear cookies
  await revokeAllUserTokens(user.sub);
  await logAuthEvent(user.sub, 'logout', { reason: 'email_changed' });
  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
