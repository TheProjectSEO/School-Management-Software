import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== ADMIN SCHOOL CONFIGURATION ===\n');

  // 1. Get the admin@gmail.com user
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find(u => u.email === 'admin@gmail.com');

  if (!adminUser) {
    console.log('❌ admin@gmail.com not found in auth.users');
    return;
  }

  console.log('Auth User ID:', adminUser.id);

  // 2. Get school_profile for this user
  const { data: schoolProfile, error: spError } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, school_id')
    .eq('auth_user_id', adminUser.id)
    .single();

  if (spError || !schoolProfile) {
    console.log('❌ school_profile not found:', spError?.message);
    return;
  }

  console.log('\nSchool Profile:');
  console.log('  ID:', schoolProfile.id);
  console.log('  Name:', schoolProfile.full_name);
  console.log('  Role:', schoolProfile.role);
  console.log('  School ID:', schoolProfile.school_id);

  // 3. Get admin record
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, profile_id, school_id')
    .eq('profile_id', schoolProfile.id)
    .single();

  if (adminError || !admin) {
    console.log('\n❌ Admin record not found:', adminError?.message);
    console.log('   This user is NOT configured as an admin!');
    return;
  }

  console.log('\nAdmin Record:');
  console.log('  ID:', admin.id);
  console.log('  Profile ID:', admin.profile_id);
  console.log('  School ID:', admin.school_id);

  // 4. Get school name
  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', admin.school_id)
    .single();

  console.log('\nAdmin School:', school?.name || 'Unknown');

  // 5. Check Grade 12 - STEM A section
  console.log('\n=== SECTION CHECK ===\n');

  const { data: section } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .ilike('name', '%12%STEM%A%')
    .single();

  if (!section) {
    console.log('❌ Grade 12 - STEM A section not found');
    return;
  }

  const { data: sectionSchool } = await supabase
    .from('schools')
    .select('name')
    .eq('id', section.school_id)
    .single();

  console.log('Section: ', section.name);
  console.log('Section School ID:', section.school_id);
  console.log('Section School Name:', sectionSchool?.name);

  // 6. Compare
  console.log('\n=== COMPARISON ===\n');

  if (admin.school_id === section.school_id) {
    console.log('✅ MATCH: Admin and Section are in the same school');
  } else {
    console.log('❌ MISMATCH:');
    console.log('   Admin school_id:', admin.school_id);
    console.log('   Section school_id:', section.school_id);
    console.log('\n   The admin cannot see this section because they belong to different schools!');
  }

  // 7. List all schools for reference
  console.log('\n=== ALL SCHOOLS ===\n');
  const { data: allSchools } = await supabase.from('schools').select('id, name');
  allSchools?.forEach(s => console.log(`  ${s.name}: ${s.id}`));
}

check();
