import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function list() {
  const supabase = createAdminClient();

  console.log('=== ALL AUTH USERS ===\n');

  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('Total auth users:', users?.users?.length || 0);
  users?.users?.forEach(u => {
    console.log(`  - ${u.email} (${u.id})`);
  });

  console.log('\n=== ALL ADMINS IN DATABASE ===\n');

  const { data: admins } = await supabase
    .from('admins')
    .select('id, profile_id, school_id');

  if (!admins || admins.length === 0) {
    console.log('No admins found in admins table');
    return;
  }

  console.log('Total admins:', admins.length);

  for (const admin of admins) {
    console.log('\nAdmin ID:', admin.id);
    console.log('Profile ID:', admin.profile_id);
    console.log('School ID:', admin.school_id);

    // Get school_profile
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('id, full_name, auth_user_id, school_id')
      .eq('id', admin.profile_id)
      .single();

    if (sp) {
      console.log('Name:', sp.full_name);
      console.log('Auth User ID:', sp.auth_user_id);
      console.log('Profile School ID:', sp.school_id);

      // Get auth user email
      if (sp.auth_user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(sp.auth_user_id);
        console.log('Email:', authUser?.user?.email || 'N/A');
      }
    }

    // Get school name
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', admin.school_id)
      .single();
    console.log('School:', school?.name || 'Unknown');
  }

  console.log('\n=== GRADE 12 STEM A SECTION ===\n');

  const { data: section } = await supabase
    .from('sections')
    .select('id, name, school_id')
    .ilike('name', '%12%STEM%A%')
    .single();

  if (section) {
    const { data: sectionSchool } = await supabase
      .from('schools')
      .select('name')
      .eq('id', section.school_id)
      .single();
    console.log('Section:', section.name);
    console.log('Section ID:', section.id);
    console.log('Section School ID:', section.school_id);
    console.log('Section School:', sectionSchool?.name);
  }
}

list();
