/**
 * Script to update user password and diagnose/fix profile issues
 * Run with: npx tsx apps/web/scripts/fix-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from apps/web/.env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TARGET_EMAIL = 'mrdariusmaster@gmail.com';
const NEW_PASSWORD = 'demo123z@';

async function main() {
  console.log('='.repeat(60));
  console.log('User Fix Script');
  console.log('='.repeat(60));
  console.log(`Target email: ${TARGET_EMAIL}`);
  console.log(`New password: ${NEW_PASSWORD}`);
  console.log('');

  // Step 1: Check all profiles to find the user by email
  console.log('Step 1: Searching in profiles table by email...');
  const { data: profileByEmail, error: profileEmailError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('email', TARGET_EMAIL)
    .single();

  if (profileByEmail) {
    console.log('  Found in profiles table:');
    console.log(`    ID: ${profileByEmail.id}`);
    console.log(`    Email: ${profileByEmail.email}`);
    console.log(`    Full name: ${profileByEmail.full_name}`);
  } else {
    console.log('  Not found in profiles table');
  }
  console.log('');

  // Step 2: Check school_profiles by searching full_name
  console.log('Step 2: Checking school_profiles...');
  const { data: allSchoolProfiles } = await adminClient
    .from('school_profiles')
    .select('*')
    .limit(20);

  console.log('  All school_profiles:');
  allSchoolProfiles?.forEach(p => {
    const authStatus = p.auth_user_id ? `auth: ${p.auth_user_id}` : 'NO AUTH';
    console.log(`    - ${p.id.slice(0, 8)}...: ${p.full_name} (${authStatus})`);
  });
  console.log('');

  // Step 3: Check teachers with their profiles
  console.log('Step 3: Checking teachers...');
  const { data: teachers } = await adminClient
    .from('teachers')
    .select('id, school_id, profile_id')
    .limit(10);

  console.log('  Teachers:');
  for (const t of teachers || []) {
    // Get profile info
    const { data: profile } = await adminClient
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', t.profile_id)
      .single();

    console.log(`    - ${t.id.slice(0, 8)}...: ${profile?.full_name || 'No profile'} (auth: ${profile?.auth_user_id || 'none'})`);
  }
  console.log('');

  // Step 4: Check teacher_profiles (different table)
  console.log('Step 4: Checking teacher_profiles...');
  const { data: teacherProfiles } = await adminClient
    .from('teacher_profiles')
    .select('id, profile_id, school_id, employee_id, department')
    .limit(10);

  console.log('  Teacher profiles:');
  for (const tp of teacherProfiles || []) {
    // Get school_profile info
    const { data: schoolProfile } = await adminClient
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', tp.profile_id)
      .single();

    console.log(`    - ${tp.id.slice(0, 8)}...: ${schoolProfile?.full_name || 'No profile'}`);
    console.log(`      school_id: ${tp.school_id}, auth: ${schoolProfile?.auth_user_id || 'none'}`);
  }
  console.log('');

  // Step 5: Try to sign in with the email to check if auth user exists
  console.log('Step 5: Attempting sign in to verify auth user exists...');
  const anonClient = createClient(supabaseUrl!, anonKey!);

  // Try with various possible passwords
  const testPasswords = ['password', 'demo123', 'Demo123!', 'demo123z@', 'admin123', 'test123', 'Password123'];

  let foundAuthUser = false;
  for (const pwd of testPasswords) {
    const { data: authResult, error: authErr } = await anonClient.auth.signInWithPassword({
      email: TARGET_EMAIL,
      password: pwd
    });

    if (authResult?.user) {
      console.log(`  SUCCESS: Found auth user with password "${pwd}"`);
      console.log(`    User ID: ${authResult.user.id}`);
      await anonClient.auth.signOut();
      foundAuthUser = true;

      // Now update the password
      console.log('');
      console.log('Step 6: Updating password...');
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(authResult.user.id, {
        password: NEW_PASSWORD
      });

      if (updateErr) {
        console.log(`  Error updating password: ${updateErr.message}`);
      } else {
        console.log(`  Password updated to: ${NEW_PASSWORD}`);
      }

      // Check if this user has school_profile
      console.log('');
      console.log('Step 7: Checking school_profile for this auth user...');
      const { data: userSchoolProfile } = await adminClient
        .from('school_profiles')
        .select('*')
        .eq('auth_user_id', authResult.user.id)
        .single();

      if (userSchoolProfile) {
        console.log('  Found school_profile!');
        console.log(`    ID: ${userSchoolProfile.id}`);
        console.log(`    Full name: ${userSchoolProfile.full_name}`);

        // Check role
        const { data: teacherRole } = await adminClient
          .from('teachers')
          .select('*')
          .eq('profile_id', userSchoolProfile.id)
          .single();

        const { data: studentRole } = await adminClient
          .from('students')
          .select('*')
          .eq('profile_id', userSchoolProfile.id)
          .single();

        const { data: adminRole } = await adminClient
          .from('admins')
          .select('*')
          .eq('profile_id', userSchoolProfile.id)
          .single();

        if (teacherRole) console.log('    Role: TEACHER');
        if (studentRole) console.log('    Role: STUDENT');
        if (adminRole) console.log('    Role: ADMIN');

        if (!teacherRole && !studentRole && !adminRole) {
          console.log('    ERROR: No role found in teachers/students/admins tables!');
          console.log('    This is why login fails.');
        }
      } else {
        console.log('  ERROR: No school_profile linked to this auth user!');
        console.log('  This is why login fails with "User account not properly configured"');
      }

      break;
    }
  }

  if (!foundAuthUser) {
    console.log('  Could not sign in - user may not exist in Supabase Auth');
    console.log('  or none of the test passwords match');
    console.log('');
    console.log('  To manually check/fix:');
    console.log('  1. Go to Supabase Dashboard -> Authentication -> Users');
    console.log(`  2. Search for: ${TARGET_EMAIL}`);
    console.log('  3. If not found, create the user');
    console.log('  4. If found, note the user ID and update school_profiles.auth_user_id');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Done!');
  console.log('='.repeat(60));
}

main().catch(console.error);
