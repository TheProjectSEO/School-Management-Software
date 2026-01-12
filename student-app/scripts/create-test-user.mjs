#!/usr/bin/env node

/**
 * Script to create a test user in Supabase Auth
 *
 * Usage:
 *   node scripts/create-test-user.mjs
 *
 * This will create a user with:
 *   Email: student@msu.edu.ph
 *   Password: Test123!
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

// Test user credentials
const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'MSUStudent2024!',
  metadata: {
    full_name: 'Test Student',
    student_id: '2024-0001',
  }
};

async function createTestUser() {
  console.log('🚀 Creating test user in Supabase...\n');

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Try to sign up the user
  const { data, error } = await supabase.auth.signUp({
    email: TEST_USER.email,
    password: TEST_USER.password,
    options: {
      data: TEST_USER.metadata,
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('✅ User already exists!');
      console.log('\nYou can now log in with:');
      console.log(`   Email: ${TEST_USER.email}`);
      console.log(`   Password: ${TEST_USER.password}\n`);
      return;
    }

    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }

  console.log('✅ Test user created successfully!\n');
  console.log('User Details:');
  console.log(`   ID: ${data.user?.id}`);
  console.log(`   Email: ${TEST_USER.email}`);
  console.log(`   Password: ${TEST_USER.password}`);
  console.log(`   Full Name: ${TEST_USER.metadata.full_name}`);
  console.log(`   Student ID: ${TEST_USER.metadata.student_id}\n`);

  if (data.user?.identities?.length === 0) {
    console.log('⚠️  Email confirmation required!');
    console.log('   Check your Supabase dashboard to confirm the user.');
    console.log('   Or disable email confirmation in: Authentication → Providers → Email\n');
  } else {
    console.log('✅ User is ready to log in!\n');
  }

  console.log('Next steps:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Open: http://localhost:3000');
  console.log('   3. Log in with the credentials above\n');
}

// Run the script
createTestUser().catch(console.error);
