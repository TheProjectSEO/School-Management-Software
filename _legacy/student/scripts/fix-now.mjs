#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'MSUStudent2024!',
  metadata: { full_name: 'Test Student', student_id: '2024-0001' }
};

console.log('🔧 FIXING LOGIN NOW...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try to create user
console.log('Creating user...');
const { data, error } = await supabase.auth.signUp({
  email: TEST_USER.email,
  password: TEST_USER.password,
  options: {
    data: TEST_USER.metadata,
    emailRedirectTo: undefined // Don't send confirmation email
  },
});

if (error && !error.message.includes('already registered')) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

if (error?.message.includes('already registered')) {
  console.log('✅ User already exists, testing login...\n');
} else {
  console.log('✅ User created!\n');
}

// Test login
console.log('Testing login...');
const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
  email: TEST_USER.email,
  password: TEST_USER.password,
});

if (loginError) {
  console.error('❌ Login failed:', loginError.message);
  console.log('\nThe user exists but email needs confirmation.');
  console.log('You need to manually confirm the email in Supabase dashboard:');
  console.log('https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/auth/users');
  console.log('\nFind student@msu.edu.ph and click to confirm email.');
  process.exit(1);
}

console.log('✅ LOGIN WORKS!\n');
console.log('You can now login at: http://localhost:3000/login');
console.log('Email:', TEST_USER.email);
console.log('Password:', TEST_USER.password);
