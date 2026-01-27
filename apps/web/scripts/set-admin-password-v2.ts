import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function setPassword() {
  const supabase = createAdminClient();
  const email = 'admin@gmail.com';
  const newPassword = 'Admin@z1';

  console.log('=== SETTING ADMIN PASSWORD ===\n');

  // Get profile ID (which is also the auth user ID)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.log('❌ Profile not found:', profileError?.message || 'No data');
    return;
  }

  console.log('Found profile ID:', profile.id);

  // Update password using the profile ID as auth user ID
  const { error } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (error) {
    console.log('\n❌ Error updating password:', error.message);

    // Try to get the user first
    const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(profile.id);

    if (getUserError) {
      console.log('Cannot get user:', getUserError.message);
    } else if (user) {
      console.log('User found, trying again...');
      const { error: retry } = await supabase.auth.admin.updateUserById(user.user.id, {
        password: newPassword,
      });
      if (retry) {
        console.log('Retry failed:', retry.message);
      } else {
        console.log('\n✅ Password updated on retry!');
      }
    }
  } else {
    console.log('\n✅ Password updated successfully!');
  }

  console.log('');
  console.log('┌─────────────────────────────────┐');
  console.log('│ ADMIN CREDENTIALS               │');
  console.log('├─────────────────────────────────┤');
  console.log('│ Email:    admin@gmail.com       │');
  console.log('│ Password: Admin@z1              │');
  console.log('└─────────────────────────────────┘');
}

setPassword();
