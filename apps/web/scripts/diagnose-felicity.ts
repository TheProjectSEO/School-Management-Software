import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function diagnose() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== DIAGNOSING FELICITY ACCOUNT ===\n');

  // 1. Find Felicity in auth
  console.log('1. AUTH USER:');
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  const felicityAuth = authData?.users?.find(u =>
    u.email?.toLowerCase().includes('felicity')
  );

  if (felicityAuth) {
    console.log('   ✅ Found auth user');
    console.log('   Email:', felicityAuth.email);
    console.log('   Auth ID:', felicityAuth.id);
  } else {
    console.log('   ❌ No auth user found with "felicity" in email');

    // List all auth users
    console.log('\n   All auth users:');
    authData?.users?.forEach(u => console.log('   -', u.email));
  }

  // 2. Find Felicity in school_profiles
  console.log('\n2. SCHOOL PROFILE:');
  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id, school_id')
    .ilike('full_name', '%felicity%');

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      console.log('   ✅ Found school_profile');
      console.log('   Name:', p.full_name);
      console.log('   Role:', p.role);
      console.log('   Profile ID:', p.id);
      console.log('   Auth User ID:', p.auth_user_id || 'NOT LINKED');
      console.log('   School ID:', p.school_id);

      // Check if school_id matches MSU
      if (p.school_id === msuId) {
        console.log('   School: ✅ Mindanao State University');
      } else if (p.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('name')
          .eq('id', p.school_id)
          .single();
        console.log('   School: ❌', school?.name || 'Unknown', '(NOT MSU!)');
      } else {
        console.log('   School: ❌ No school assigned');
      }
    }
  } else {
    console.log('   ❌ No school_profile found for Felicity');
  }

  // 3. Find Felicity in teacher_profiles
  console.log('\n3. TEACHER PROFILE:');
  const felicityProfile = profiles?.[0];

  if (felicityProfile) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id, profile_id, school_id, is_active')
      .eq('profile_id', felicityProfile.id)
      .single();

    if (teacherProfile) {
      console.log('   ✅ Found teacher_profile');
      console.log('   Teacher ID:', teacherProfile.id);
      console.log('   School ID:', teacherProfile.school_id);
      console.log('   Is Active:', teacherProfile.is_active);

      // Check if school matches MSU
      if (teacherProfile.school_id === msuId) {
        console.log('   School: ✅ Mindanao State University');
      } else {
        const { data: school } = await supabase
          .from('schools')
          .select('name')
          .eq('id', teacherProfile.school_id)
          .single();
        console.log('   School: ❌', school?.name || 'Unknown', '(NOT MSU!)');
      }

      // 4. Check course assignments
      console.log('\n4. COURSE ASSIGNMENTS (teacher_course_sections):');
      const { data: assignments } = await supabase
        .from('teacher_course_sections')
        .select('id, course_id, section_id, is_primary')
        .eq('teacher_id', teacherProfile.id);

      if (assignments && assignments.length > 0) {
        console.log('   ✅ Found', assignments.length, 'course assignments');
        for (const a of assignments) {
          const { data: course } = await supabase
            .from('courses')
            .select('name')
            .eq('id', a.course_id)
            .single();
          const { data: section } = await supabase
            .from('sections')
            .select('name')
            .eq('id', a.section_id)
            .single();
          console.log(`   - ${course?.name} in ${section?.name}`);
        }
      } else {
        console.log('   ❌ No course assignments found!');
        console.log('   This is why Felicity sees no data - she has no courses assigned!');
      }

      // 5. Check advisory sections
      console.log('\n5. ADVISORY SECTIONS (section_advisers):');
      const { data: advisories } = await supabase
        .from('section_advisers')
        .select('id, section_id')
        .eq('teacher_id', teacherProfile.id);

      if (advisories && advisories.length > 0) {
        console.log('   ✅ Found', advisories.length, 'advisory sections');
        for (const a of advisories) {
          const { data: section } = await supabase
            .from('sections')
            .select('name')
            .eq('id', a.section_id)
            .single();
          console.log(`   - ${section?.name}`);
        }
      } else {
        console.log('   ❌ No advisory sections found');
      }

    } else {
      console.log('   ❌ No teacher_profile found for Felicity');
    }
  }

  // 6. What should be there - courses in Grade 12 STEM A
  console.log('\n6. COURSES IN GRADE 12 - STEM A:');
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, section_id, teacher_id')
    .eq('section_id', grade12StemAId);

  if (courses && courses.length > 0) {
    console.log('   Found', courses.length, 'courses in Grade 12 - STEM A');
    for (const c of courses) {
      console.log(`   - ${c.name} (teacher_id: ${c.teacher_id || 'NONE'})`);
    }
  } else {
    console.log('   ❌ No courses found in Grade 12 - STEM A');
  }

  // Also check courses by school
  console.log('\n7. ALL COURSES IN MSU:');
  const { data: allCourses } = await supabase
    .from('courses')
    .select('id, name, section_id, school_id')
    .eq('school_id', msuId)
    .limit(10);

  console.log('   Found', allCourses?.length || 0, 'courses (showing first 10)');
  allCourses?.forEach(c => {
    console.log(`   - ${c.name} (section: ${c.section_id})`);
  });
}

diagnose();
