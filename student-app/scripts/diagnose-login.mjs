#!/usr/bin/env node
/**
 * Quick diagnostic to check login issue
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const TEST_CREDENTIALS = {
  email: 'student@msu.edu.ph',
  password: 'MSUStudent2024!',
};

console.log('🔍 LOGIN DIAGNOSTIC TOOL\n');
console.log('='.repeat(70));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Step 1: Check if signups are enabled
console.log('\n📝 Step 1: Testing if signups are enabled...');
const { data: signupTest, error: signupError } = await supabase.auth.signUp({
  email: 'test-signup-check@example.com',
  password: 'TempPassword123!',
});

if (signupError) {
  if (signupError.message.includes('Signups not allowed')) {
    console.log('❌ SIGNUPS ARE STILL DISABLED!');
    console.log('   You must enable signups in Supabase dashboard first.');
    console.log('   URL: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/providers');
    console.log('   Toggle: "Allow new users to sign up" → GREEN');
    process.exit(1);
  }
}

console.log('✅ Signups are enabled');

// Step 2: Try to login with test credentials
console.log('\n🔐 Step 2: Attempting login with test credentials...');
console.log(`   Email: ${TEST_CREDENTIALS.email}`);
console.log(`   Password: ${TEST_CREDENTIALS.password}`);

const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
  email: TEST_CREDENTIALS.email,
  password: TEST_CREDENTIALS.password,
});

if (loginError) {
  console.log(`\n❌ LOGIN FAILED!`);
  console.log(`   Error: ${loginError.message}`);

  if (loginError.message.includes('Invalid login credentials')) {
    console.log('\n💡 This means either:');
    console.log('   1. The user does not exist in Supabase');
    console.log('   2. The password is incorrect');
    console.log('   3. The email needs to be confirmed');

    console.log('\n🔧 Let me check if the user exists...');

    // Try to create the user
    const { data: createData, error: createError } = await supabase.auth.signUp({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
      options: {
        data: {
          full_name: 'Test Student',
          student_id: '2024-0001',
        },
      },
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('   ✅ User exists in database');
        console.log('   ❌ But login failed - possible reasons:');
        console.log('      • Email not confirmed');
        console.log('      • Wrong password');
        console.log('      • Account disabled');

        console.log('\n📋 ACTION REQUIRED:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users');
        console.log('   2. Find user: student@msu.edu.ph');
        console.log('   3. Check if "Email Confirmed" is YES');
        console.log('   4. If NO, click the user and confirm the email');
        console.log('   5. Try login again');
      } else {
        console.log(`   ❌ Error creating user: ${createError.message}`);
      }
    } else {
      console.log('   ✅ User created successfully!');
      console.log('   User ID:', createData.user?.id);

      if (createData.user?.identities?.length === 0) {
        console.log('\n   ⚠️  EMAIL CONFIRMATION REQUIRED!');
        console.log('   Go to Supabase dashboard and confirm the email:');
        console.log('   https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users');
      } else {
        console.log('   ✅ Email confirmed, you should be able to login now!');
      }
    }
  } else {
    console.log(`\n   Unexpected error: ${loginError.message}`);
  }

  process.exit(1);
}

console.log('✅ LOGIN SUCCESSFUL!');
console.log(`   User ID: ${loginData.user?.id}`);
console.log(`   Email: ${loginData.user?.email}`);

// Step 3: Check database records
console.log('\n📊 Step 3: Checking database records...');

// Wait a moment for triggers to complete
await new Promise(resolve => setTimeout(resolve, 2000));

const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('auth_user_id', loginData.user.id)
  .single();

if (profile) {
  console.log(`✅ Profile exists: ${profile.full_name}`);
} else {
  console.log('⚠️  Profile not found');
}

const { data: student } = await supabase
  .from('students')
  .select('id, lrn, grade_level')
  .eq('profile_id', profile?.id)
  .single();

if (student) {
  console.log(`✅ Student record exists: LRN ${student.lrn}`);
} else {
  console.log('⚠️  Student record not found');
}

console.log('\n' + '='.repeat(70));
console.log('🎉 EVERYTHING LOOKS GOOD!');
console.log('\nYou should be able to login at:');
console.log('   http://localhost:3000/login');
console.log('\nWith credentials:');
console.log(`   Email: ${TEST_CREDENTIALS.email}`);
console.log(`   Password: ${TEST_CREDENTIALS.password}`);
console.log('\n' + '='.repeat(70));
