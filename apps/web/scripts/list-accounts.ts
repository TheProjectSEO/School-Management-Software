/**
 * List all demo accounts with their roles
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('='.repeat(60));
  console.log('ACCOUNT LIST');
  console.log('='.repeat(60));
  console.log('');

  // Get all students with profiles
  console.log('STUDENTS:');
  console.log('-'.repeat(40));
  const { data: students } = await adminClient
    .from('students')
    .select(`
      id,
      school_id,
      profile:profile_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .limit(20);

  for (const s of students || []) {
    const profile = s.profile as any;
    if (profile?.auth_user_id) {
      // Get email from auth
      const { data: authUser } = await adminClient.auth.admin.getUserById(profile.auth_user_id);
      console.log(`  ${authUser?.user?.email || 'No email'}`);
      console.log(`    Name: ${profile?.full_name || 'N/A'}`);
      console.log(`    Auth ID: ${profile.auth_user_id}`);
      console.log('');
    }
  }

  // Get all teachers with profiles
  console.log('TEACHERS:');
  console.log('-'.repeat(40));
  const { data: teachers } = await adminClient
    .from('teachers')
    .select(`
      id,
      school_id,
      profile:profile_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .limit(20);

  for (const t of teachers || []) {
    const profile = t.profile as any;
    if (profile?.auth_user_id) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(profile.auth_user_id);
      console.log(`  ${authUser?.user?.email || 'No email'}`);
      console.log(`    Name: ${profile?.full_name || 'N/A'}`);
      console.log(`    Auth ID: ${profile.auth_user_id}`);
      console.log('');
    }
  }

  // Get all admins with profiles
  console.log('ADMINS:');
  console.log('-'.repeat(40));
  const { data: admins } = await adminClient
    .from('admins')
    .select(`
      id,
      school_id,
      profile:profile_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .limit(20);

  for (const a of admins || []) {
    const profile = a.profile as any;
    if (profile?.auth_user_id) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(profile.auth_user_id);
      console.log(`  ${authUser?.user?.email || 'No email'}`);
      console.log(`    Name: ${profile?.full_name || 'N/A'}`);
      console.log(`    Auth ID: ${profile.auth_user_id}`);
      console.log('');
    }
  }

  // Check mrdariusmaster specifically
  console.log('');
  console.log('='.repeat(60));
  console.log('CHECKING mrdariusmaster@gmail.com');
  console.log('='.repeat(60));

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('email', 'mrdariusmaster@gmail.com')
    .single();

  if (profile) {
    console.log('Profile found:', profile.id);

    // Check if in students
    const { data: studentCheck } = await adminClient
      .from('students')
      .select('*')
      .eq('profile_id', '370843c8-c593-42c0-8676-410b999e7769');

    console.log('Student records with this profile_id:', studentCheck?.length || 0);

    // Check school_profiles
    const { data: schoolProfile } = await adminClient
      .from('school_profiles')
      .select('*')
      .eq('auth_user_id', profile.id)
      .single();

    if (schoolProfile) {
      console.log('School profile found:', schoolProfile.id);

      // Check students with school_profile id
      const { data: studentCheck2 } = await adminClient
        .from('students')
        .select('*')
        .eq('profile_id', schoolProfile.id);

      console.log('Student records with school_profile_id:', studentCheck2?.length || 0);
      if (studentCheck2 && studentCheck2.length > 0) {
        console.log('Student:', JSON.stringify(studentCheck2[0], null, 2));
      }
    }
  }
}

main().catch(console.error);
