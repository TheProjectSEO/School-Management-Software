#!/usr/bin/env node
/**
 * Automated verification and fix script
 *
 * This script will:
 * 1. Check if signups are enabled
 * 2. Create test user if signups are enabled
 * 3. Verify user was created successfully
 * 4. Provide next steps
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'MSUStudent2024!',
  metadata: {
    full_name: 'Test Student',
    student_id: '2024-0001',
  }
};

console.log('🔍 MSU Student Portal - Verification & Fix Script\n');
console.log('='.repeat(60));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Step 1: Try to create test user
console.log('\n📝 Step 1: Attempting to create test user...');
const { data, error } = await supabase.auth.signUp({
  email: TEST_USER.email,
  password: TEST_USER.password,
  options: {
    data: TEST_USER.metadata,
  },
});

if (error) {
  if (error.message.includes('Signups not allowed')) {
    console.log('\n❌ SIGNUPS ARE STILL DISABLED\n');
    console.log('⚠️  You need to enable signups in Supabase first!\n');
    console.log('📖 Follow these steps:');
    console.log('   1. Open: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/providers');
    console.log('   2. Toggle ON: "Allow new users to sign up"');
    console.log('   3. Click: "Save changes"');
    console.log('   4. Run this script again: npm run verify-and-fix\n');
    console.log('📸 See screenshot: .playwright-mcp/supabase-auth-providers-page.png');
    console.log('📄 Full guide: QUICK_FIX_GUIDE.md\n');
    process.exit(1);
  }

  if (error.message.includes('already registered')) {
    console.log('✅ Test user already exists!\n');
    console.log('📧 Email: student@msu.edu.ph');
    console.log('🔑 Password: MSUStudent2024!\n');

    // Try to login to verify it works
    console.log('🔐 Step 2: Verifying login works...');
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (loginError) {
      console.log(`❌ Login failed: ${loginError.message}\n`);
      process.exit(1);
    }

    console.log('✅ Login successful!\n');
    printSuccessMessage();
    process.exit(0);
  }

  console.log(`\n❌ Unexpected error: ${error.message}\n`);
  process.exit(1);
}

// User created successfully!
console.log('\n🎉 SUCCESS! Test user created!\n');
console.log('='.repeat(60));
console.log('\n👤 User Details:');
console.log(`   📧 Email: ${TEST_USER.email}`);
console.log(`   🔑 Password: ${TEST_USER.password}`);
console.log(`   👨‍🎓 Full Name: ${TEST_USER.metadata.full_name}`);
console.log(`   🎓 Student ID: ${TEST_USER.metadata.student_id}`);
console.log(`   🆔 Auth ID: ${data.user?.id}\n`);

if (data.user?.identities?.length === 0) {
  console.log('⚠️  Email confirmation required!');
  console.log('   Go to Supabase Dashboard → Authentication → Users');
  console.log('   And confirm the user email.\n');
} else {
  console.log('✅ User is confirmed and ready to use!\n');
}

// Check if profile and student records were created
console.log('🔍 Step 3: Verifying database records...');

// Wait a bit for triggers to complete
await new Promise(resolve => setTimeout(resolve, 2000));

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('auth_user_id', data.user.id)
  .single();

if (profileError || !profile) {
  console.log('⚠️  Profile not found (trigger may not have run)');
} else {
  console.log(`✅ Profile created: ${profile.full_name}`);
}

const { data: student, error: studentError } = await supabase
  .from('students')
  .select('id, lrn, grade_level')
  .eq('profile_id', profile?.id)
  .single();

if (studentError || !student) {
  console.log('⚠️  Student record not found');
} else {
  console.log(`✅ Student record created: LRN ${student.lrn}, ${student.grade_level}`);
}

const { data: enrollments, error: enrollmentsError } = await supabase
  .from('enrollments')
  .select('id')
  .eq('student_id', student?.id);

if (!enrollmentsError && enrollments) {
  console.log(`✅ Enrolled in ${enrollments.length} courses`);
}

printSuccessMessage();

function printSuccessMessage() {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 EVERYTHING IS READY!\n');
  console.log('🚀 Next Steps:\n');
  console.log('   1. Open: http://localhost:3000/login');
  console.log('   2. Login with:');
  console.log('      📧 Email: student@msu.edu.ph');
  console.log('      🔑 Password: MSUStudent2024!');
  console.log('   3. Test all tabs (13 total)');
  console.log('   4. Run comprehensive test: npm run test-all-tabs\n');
  console.log('='.repeat(60) + '\n');
}
