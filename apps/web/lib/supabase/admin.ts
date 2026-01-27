import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase admin client with service role key
 * This client bypasses RLS and should only be used server-side
 * for administrative operations like creating users, managing roles, etc.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get user role from database
 * Schema:
 * - school_profiles.auth_user_id = auth.users.id
 * - students.profile_id = school_profiles.id
 * - teachers.profile_id = school_profiles.id
 * - admins.profile_id = school_profiles.id (or direct auth.users.id)
 */
export async function getUserRole(userId: string): Promise<{
  role: 'admin' | 'teacher' | 'student' | 'super_admin';
  profileId: string;
  schoolId?: string;
} | null> {
  const supabase = createAdminClient();

  // First, find the school_profile for this auth user
  const { data: schoolProfile } = await supabase
    .from('school_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  const profileId = schoolProfile?.id;

  // Check admins first - try with auth.users.id
  let adminUser = null;
  const { data: adminByUserId } = await supabase
    .from('admins')
    .select('id, school_id')
    .eq('profile_id', userId)
    .single();

  if (adminByUserId) {
    adminUser = adminByUserId;
  } else if (profileId) {
    // Try with school_profiles.id
    const { data: adminByProfileId } = await supabase
      .from('admins')
      .select('id, school_id')
      .eq('profile_id', profileId)
      .single();
    adminUser = adminByProfileId;
  }

  if (adminUser) {
    return {
      role: 'admin',
      profileId: profileId || adminUser.id, // Use school_profile.id if available, otherwise admin.id
      schoolId: adminUser.school_id,
    };
  }

  // If no school_profile, can't be teacher or student
  if (!profileId) {
    return null;
  }

  // Check teachers (profile_id = school_profiles.id)
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id, school_id')
    .eq('profile_id', profileId)
    .single();

  if (teacher) {
    return {
      role: 'teacher',
      profileId: profileId, // Use school_profile.id
      schoolId: teacher.school_id,
    };
  }

  // Check students (profile_id = school_profiles.id)
  const { data: student } = await supabase
    .from('students')
    .select('id, school_id')
    .eq('profile_id', profileId)
    .single();

  if (student) {
    return {
      role: 'student',
      profileId: profileId, // Use school_profile.id
      schoolId: student.school_id,
    };
  }

  return null;
}

/**
 * Get user email from auth.users
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return null;
  }

  return data.user.email || null;
}

/**
 * Store refresh token hash in database
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  userAgent?: string,
  ipAddress?: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error storing refresh token:', error);
    return null;
  }

  return data.id;
}

/**
 * Verify refresh token exists and is not revoked
 */
export async function verifyStoredRefreshToken(
  tokenHash: string
): Promise<{ id: string; userId: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return { id: data.id, userId: data.user_id };
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(tokenId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId);

  return !error;
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  return !error;
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string | null,
  eventType: 'login' | 'logout' | 'token_refresh' | 'permission_denied' | 'login_failed',
  metadata?: Record<string, unknown>,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('auth_audit_log').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
    user_agent: userAgent,
    ip_address: ipAddress,
  });
}

/**
 * Get user permissions from database (for custom overrides)
 */
export async function getUserPermissionOverrides(
  userId: string
): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId)
    .eq('granted', true);

  if (error || !data) {
    return [];
  }

  return data.map((p) => p.permission);
}
