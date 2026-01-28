import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function checkProfiles() {
  const supabase = createAdminClient();

  console.log('=== TEACHER PROFILE CHECK ===\n');

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  for (const t of teachers || []) {
    console.log('Teacher ID:', t.id);
    console.log('Profile ID:', t.profile_id);

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_id')
      .eq('id', t.profile_id)
      .single();

    if (profileError) {
      console.log('  ❌ Profile ERROR:', profileError.message);
    } else if (!profile) {
      console.log('  ❌ Profile NOT FOUND');
    } else {
      console.log('  Profile Name:', profile.full_name || 'N/A');
      console.log('  Profile Email:', profile.email || 'N/A');
      console.log('  Auth User ID:', profile.user_id || 'N/A');

      // Get auth user email if available
      if (profile.user_id) {
        const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);
        console.log('  Auth Email:', authData?.user?.email || 'N/A');
      }
    }
    console.log('');
  }

  // Also check profiles table directly for teachers
  console.log('=== PROFILES WITH ROLE=TEACHER ===\n');

  const { data: teacherProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, user_id')
    .eq('role', 'teacher');

  for (const p of teacherProfiles || []) {
    console.log('Profile:', p.full_name || 'N/A');
    console.log('  Email:', p.email || 'N/A');
    console.log('  Profile ID:', p.id);

    // Check if has teacher_profile record
    const { data: tp } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', p.id)
      .single();

    console.log('  Has teacher_profile:', tp ? '✅ Yes' : '❌ No');

    if (p.user_id) {
      const { data: authData } = await supabase.auth.admin.getUserById(p.user_id);
      console.log('  Auth Email:', authData?.user?.email || 'N/A');
    }
    console.log('');
  }
}

checkProfiles();
