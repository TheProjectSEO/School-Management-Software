import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function find() {
  const supabase = createAdminClient();

  console.log('=== DEEP SEARCH FOR FELICITY ===\n');

  // 1. Search in profiles table by email
  console.log('1. PROFILES TABLE (by email):');
  const { data: profilesByEmail } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', '%felicity%');

  if (profilesByEmail?.length) {
    profilesByEmail.forEach(p => {
      console.log(`   - ${p.full_name}`);
      console.log(`     Email: ${p.email}`);
      console.log(`     ID: ${p.id}`);
    });
  } else {
    console.log('   None found');
  }

  // 2. Search all school_profiles
  console.log('\n2. ALL SCHOOL PROFILES:');
  const { data: allProfiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id, school_id');

  console.log('   Total:', allProfiles?.length || 0);

  const felicityProfiles = allProfiles?.filter(p =>
    p.full_name?.toLowerCase().includes('felicity') ||
    p.full_name?.toLowerCase().includes('feli')
  );

  if (felicityProfiles?.length) {
    console.log('\n   Felicity profiles found:');
    felicityProfiles.forEach(p => {
      console.log(`   - ${p.full_name} (${p.role})`);
      console.log(`     Profile ID: ${p.id}`);
      console.log(`     Auth User ID: ${p.auth_user_id}`);
      console.log(`     School ID: ${p.school_id}`);
    });
  } else {
    console.log('   No profiles with "felicity" in name');
  }

  // 3. Search teacher_profiles
  console.log('\n3. ALL TEACHER PROFILES:');
  const { data: allTeachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id, is_active');

  console.log('   Total teachers:', allTeachers?.length || 0);

  for (const t of allTeachers || []) {
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', t.profile_id)
      .single();

    // Get email from profiles if auth_user_id exists
    let email = 'No auth';
    if (sp?.auth_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', sp.auth_user_id)
        .single();
      email = profile?.email || 'No profile email';
    }

    const isFelicity = sp?.full_name?.toLowerCase().includes('felicity');
    const marker = isFelicity ? '>>> ' : '    ';

    console.log(`${marker}${sp?.full_name || 'Unknown'}`);
    console.log(`${marker}  Teacher ID: ${t.id}`);
    console.log(`${marker}  School ID: ${t.school_id}`);
    console.log(`${marker}  Email: ${email}`);
    console.log(`${marker}  Active: ${t.is_active}`);
    console.log('');
  }

  // 4. Check teacher_course_sections
  console.log('\n4. TEACHER COURSE ASSIGNMENTS:');
  const { data: allAssignments } = await supabase
    .from('teacher_course_sections')
    .select('id, teacher_id, course_id, section_id');

  console.log('   Total assignments:', allAssignments?.length || 0);

  if (allAssignments?.length === 0) {
    console.log('   ❌ NO COURSE ASSIGNMENTS EXIST!');
    console.log('   This is why teachers see zero data - courses are not assigned to teachers!');
  }

  // 5. Check courses table for teacher_id
  console.log('\n5. COURSES WITH TEACHERS ASSIGNED:');
  const { data: coursesWithTeachers } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .not('teacher_id', 'is', null)
    .limit(10);

  console.log('   Courses with teacher_id set:', coursesWithTeachers?.length || 0);
  coursesWithTeachers?.forEach(c => {
    console.log(`   - ${c.name}: ${c.teacher_id}`);
  });
}

find();
