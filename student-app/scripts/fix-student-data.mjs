#!/usr/bin/env node

/**
 * Script to diagnose and fix missing student data
 * This addresses the PGRST116 error where student records don't exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const TARGET_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEMO_SCHOOL_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_SECTION_ID = '22222222-2222-2222-2222-222222222222';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' }
});

async function checkAuthUser() {
  console.log('\n=== STEP 1: Check Auth User ===');

  // We can't query auth.users directly with anon key, so we'll check via profile
  console.log(`Looking for auth user: ${TARGET_USER_ID}`);
  console.log('Note: Will verify via profile existence');
}

async function checkProfile() {
  console.log('\n=== STEP 2: Check Profile ===');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', TARGET_USER_ID)
    .maybeSingle();

  if (error) {
    console.error('❌ Error querying profiles:', error);
    return null;
  }

  if (data) {
    console.log('✅ Profile found:', data);
    return data;
  } else {
    console.log('❌ No profile found for this auth user');
    return null;
  }
}

async function checkStudent(profileId) {
  console.log('\n=== STEP 3: Check Student ===');

  if (!profileId) {
    console.log('⚠️  Skipping student check - no profile ID');
    return null;
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error querying students:', error);
    return null;
  }

  if (data) {
    console.log('✅ Student record found:', data);
    return data;
  } else {
    console.log('❌ No student record found for this profile');
    return null;
  }
}

async function createProfile() {
  console.log('\n=== STEP 4: Create Missing Profile ===');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: TARGET_USER_ID,
      full_name: 'Demo Student',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating profile:', error);
    return null;
  }

  console.log('✅ Profile created:', data);
  return data;
}

async function createStudent(profileId) {
  console.log('\n=== STEP 5: Create Missing Student ===');

  const { data, error } = await supabase
    .from('students')
    .insert({
      school_id: DEMO_SCHOOL_ID,
      profile_id: profileId,
      lrn: '123456789012',
      grade_level: 'College - 2nd Year',
      section_id: DEMO_SECTION_ID,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating student:', error);
    return null;
  }

  console.log('✅ Student created:', data);
  return data;
}

async function createEnrollments(studentId) {
  console.log('\n=== STEP 6: Create Default Enrollments ===');

  const courseIds = [
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555',
  ];

  const enrollments = courseIds.map(courseId => ({
    school_id: DEMO_SCHOOL_ID,
    student_id: studentId,
    course_id: courseId,
  }));

  const { data, error } = await supabase
    .from('enrollments')
    .insert(enrollments)
    .select();

  if (error) {
    console.error('❌ Error creating enrollments:', error);
    return null;
  }

  console.log(`✅ Created ${data.length} enrollments`);
  return data;
}

async function main() {
  console.log('🔍 Starting Student Data Diagnostic...\n');
  console.log(`Target User ID: ${TARGET_USER_ID}`);

  await checkAuthUser();

  let profile = await checkProfile();
  let student = null;

  if (!profile) {
    console.log('\n⚠️  Profile missing - attempting to create...');
    profile = await createProfile();

    if (!profile) {
      console.error('\n❌ FAILED: Could not create profile. Check permissions.');
      process.exit(1);
    }
  }

  student = await checkStudent(profile.id);

  if (!student) {
    console.log('\n⚠️  Student record missing - attempting to create...');
    student = await createStudent(profile.id);

    if (!student) {
      console.error('\n❌ FAILED: Could not create student. Check permissions.');
      process.exit(1);
    }

    // Create enrollments for new student
    await createEnrollments(student.id);
  }

  console.log('\n✅ DIAGNOSIS COMPLETE');
  console.log('\nSummary:');
  console.log('- Profile ID:', profile.id);
  console.log('- Student ID:', student.id);
  console.log('- School ID:', student.school_id);
  console.log('- Grade Level:', student.grade_level);

  console.log('\n🎉 Student data is now ready!');
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
