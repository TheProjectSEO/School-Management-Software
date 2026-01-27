import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function findTeacher() {
  const supabase = createAdminClient();

  console.log('=== SEARCHING FOR admin@gmail.com ===\n');

  // 1. List all auth users
  console.log('=== AUTH USERS ===\n');
  const { data: authData } = await supabase.auth.admin.listUsers();

  const adminUsers = authData?.users?.filter(u =>
    u.email?.includes('admin') || u.email?.includes('teacher')
  ) || [];

  console.log('Users with "admin" or "teacher" in email:');
  adminUsers.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id})`);
  });

  // 2. Search profiles table
  console.log('\n=== PROFILES TABLE ===\n');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .or('email.ilike.%admin%,role.eq.teacher');

  console.log('Profiles with admin in email or teacher role:');
  profiles?.forEach(p => {
    console.log(`  - ${p.full_name || 'N/A'} | ${p.email || 'No email'} | Role: ${p.role || 'N/A'}`);
    console.log(`    ID: ${p.id}`);
  });

  // 3. Search school_profiles table
  console.log('\n=== SCHOOL_PROFILES TABLE ===\n');
  const { data: schoolProfiles } = await supabase
    .from('school_profiles')
    .select('id, email, full_name, role, auth_user_id')
    .or('email.ilike.%admin%,role.eq.teacher');

  console.log('School profiles with admin in email or teacher role:');
  schoolProfiles?.forEach(p => {
    console.log(`  - ${p.full_name || 'N/A'} | ${p.email || 'No email'} | Role: ${p.role || 'N/A'}`);
    console.log(`    ID: ${p.id}`);
    console.log(`    Auth User ID: ${p.auth_user_id || 'N/A'}`);
  });

  // 4. Check teacher_profiles and their linked profiles
  console.log('\n=== TEACHER_PROFILES WITH DETAILS ===\n');
  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  for (const t of teachers || []) {
    // Check profiles table
    const { data: prof } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', t.profile_id)
      .single();

    // Check school_profiles table
    const { data: schoolProf } = await supabase
      .from('school_profiles')
      .select('email, full_name, auth_user_id')
      .eq('id', t.profile_id)
      .single();

    const profile = prof || schoolProf;

    console.log(`Teacher ID: ${t.id}`);
    console.log(`  Profile ID: ${t.profile_id}`);
    console.log(`  Name: ${profile?.full_name || 'N/A'}`);
    console.log(`  Email: ${profile?.email || 'N/A'}`);
    console.log(`  School ID: ${t.school_id}`);
    console.log('');
  }

  // 5. List all auth users
  console.log('\n=== ALL AUTH USERS ===\n');
  authData?.users?.slice(0, 15).forEach(u => {
    console.log(`  ${u.email} | Created: ${new Date(u.created_at).toLocaleDateString()}`);
  });
  if ((authData?.users?.length || 0) > 15) {
    console.log(`  ... and ${(authData?.users?.length || 0) - 15} more`);
  }
}

findTeacher();
