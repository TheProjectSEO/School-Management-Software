import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();

  console.log('=== AUTH SETUP VERIFICATION ===\n');

  // List all users (paginated)
  const { data: usersData, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100
  });

  if (error) {
    console.log('Error listing users:', error.message);
    return;
  }

  console.log('Auth users found:', usersData?.users?.length || 0);

  if (usersData?.users && usersData.users.length > 0) {
    console.log('\nUsers:');
    usersData.users.forEach(u => {
      console.log(`  - ${u.email}`);
      console.log(`    ID: ${u.id}`);
      console.log(`    Created: ${u.created_at}`);
    });
  }

  // Check school_profiles with auth_user_id
  console.log('\n=== SCHOOL PROFILES WITH AUTH ===\n');

  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id')
    .not('auth_user_id', 'is', null);

  console.log('Profiles with auth_user_id:', profiles?.length || 0);
  profiles?.forEach(p => {
    console.log(`  - ${p.full_name} (${p.role})`);
    console.log(`    Auth User ID: ${p.auth_user_id}`);
  });

  // Check admins
  console.log('\n=== ADMINS ===\n');

  const { data: admins } = await supabase
    .from('admins')
    .select('id, profile_id, school_id');

  for (const admin of admins || []) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', admin.profile_id)
      .single();

    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', admin.school_id)
      .single();

    console.log(`  - ${profile?.full_name || 'Unknown'}`);
    console.log(`    School: ${school?.name}`);
    console.log(`    Has Auth: ${profile?.auth_user_id ? 'Yes' : 'No'}`);
  }

  // Check sections in MSU
  console.log('\n=== SECTIONS IN MINDANAO STATE UNIVERSITY ===\n');

  const msuId = '11111111-1111-1111-1111-111111111111';
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, grade_level')
    .eq('school_id', msuId);

  console.log('Sections found:', sections?.length || 0);
  sections?.forEach(s => {
    console.log(`  - ${s.name} (Grade ${s.grade_level})`);
  });
}

verify();
