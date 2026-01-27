import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function deepFind() {
  const supabase = createAdminClient();

  console.log('=== DEEP SEARCH FOR admin@gmail.com ===\n');

  // Check ALL tables that might have email
  const tablesToCheck = [
    'profiles',
    'school_profiles',
    'users',
    'auth.users',
  ];

  // 1. Direct query to profiles
  console.log('=== 1. PROFILES TABLE (all) ===\n');
  const { data: allProfiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);

  if (profError) {
    console.log('Error:', profError.message);
  } else {
    console.log('Sample profiles:', allProfiles?.length || 0);
    allProfiles?.slice(0, 5).forEach(p => {
      console.log(`  ID: ${p.id}`);
      console.log(`  Data: ${JSON.stringify(p).substring(0, 200)}...`);
      console.log('');
    });
  }

  // 2. Direct query to school_profiles
  console.log('=== 2. SCHOOL_PROFILES TABLE (all) ===\n');
  const { data: allSchoolProfiles, error: spError } = await supabase
    .from('school_profiles')
    .select('*')
    .limit(10);

  if (spError) {
    console.log('Error:', spError.message);
  } else {
    console.log('Sample school_profiles:', allSchoolProfiles?.length || 0);
    allSchoolProfiles?.slice(0, 5).forEach(p => {
      console.log(`  ID: ${p.id}`);
      console.log(`  Email: ${p.email}`);
      console.log(`  Name: ${p.full_name}`);
      console.log(`  Role: ${p.role}`);
      console.log('');
    });
  }

  // 3. Check auth.users via admin API
  console.log('=== 3. AUTH USERS (via admin API) ===\n');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('Error:', authError.message);
  } else {
    console.log('Total auth users:', authData?.users?.length || 0);
    authData?.users?.forEach(u => {
      console.log(`  ${u.email || 'no email'} | ID: ${u.id} | Created: ${u.created_at}`);
    });
  }

  // 4. Search for 'admin' anywhere
  console.log('\n=== 4. SEARCH FOR "admin" IN school_profiles ===\n');
  const { data: adminSearch } = await supabase
    .from('school_profiles')
    .select('*')
    .ilike('email', '%admin%');

  console.log('Found:', adminSearch?.length || 0);
  adminSearch?.forEach(p => {
    console.log(`  ${p.email} | ${p.full_name} | Role: ${p.role}`);
  });

  // 5. Get profile_id references in teacher_profiles
  console.log('\n=== 5. VERIFY PROFILE REFERENCES ===\n');
  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id')
    .limit(3);

  for (const t of teachers || []) {
    console.log(`Teacher ${t.id}:`);
    console.log(`  Profile ID: ${t.profile_id}`);

    // Check if exists in profiles
    const { data: p1 } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', t.profile_id)
      .single();

    console.log(`  In profiles table: ${p1 ? 'YES' : 'NO'}`);

    // Check if exists in school_profiles
    const { data: p2 } = await supabase
      .from('school_profiles')
      .select('id, email, full_name')
      .eq('id', t.profile_id)
      .single();

    console.log(`  In school_profiles: ${p2 ? `YES - ${p2.email} (${p2.full_name})` : 'NO'}`);
    console.log('');
  }

  // 6. Check what the teacher API uses for profile resolution
  console.log('=== 6. CHECKING RPC FUNCTIONS ===\n');

  // Try the get_teacher_profile RPC if it exists
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_teacher_courses', {
      p_teacher_profile_id: teachers?.[0]?.id
    });
    console.log('RPC get_teacher_courses result:', rpcResult?.length || 0, 'courses');
  } catch (e) {
    console.log('RPC not available or error');
  }
}

deepFind();
