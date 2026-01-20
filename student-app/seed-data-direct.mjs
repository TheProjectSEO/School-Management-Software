#!/usr/bin/env node

/**
 * Seed Data Directly Using Supabase Client
 * Uses anon key - works without service role key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { db: { schema: 'public' } }
);

const STUDENT_ID = 'cc0c8b60-5736-4299-8015-e0a649119b8f';
const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';

console.log('🚀 Seeding data for student:', STUDENT_ID, '\n');

// Step 1: Enroll in all courses
console.log('📋 Step 1: Creating enrollments...');
const { data: courses } = await supabase.from('courses').select('id, name').limit(10);

if (courses && courses.length > 0) {
  const enrollments = courses.map(c => ({
    school_id: SCHOOL_ID,
    student_id: STUDENT_ID,
    course_id: c.id
  }));

  const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);

  if (enrollError) {
    console.log('   ⚠️', enrollError.message);
  } else {
    console.log(`   ✅ Enrolled in ${courses.length} courses`);
  }
}

// Step 2: Create notifications
console.log('\n📋 Step 2: Creating notifications...');
const notifications = [
  { student_id: STUDENT_ID, type: 'assignment', title: 'Assignment Due Soon', message: 'Check your assignments!', is_read: false, action_url: '/assessments' },
  { student_id: STUDENT_ID, type: 'welcome', title: 'Welcome to MSU!', message: 'Start your journey!', is_read: false, action_url: '/subjects' },
  { student_id: STUDENT_ID, type: 'info', title: 'Explore Courses', message: 'You are enrolled in courses!', is_read: false, action_url: '/subjects' }
];

const { error: notifError } = await supabase.from('notifications').insert(notifications);

if (notifError) {
  console.log('   ⚠️', notifError.message);
} else {
  console.log('   ✅ Created 3 notifications');
}

// Verify
console.log('\n📊 Verification:');
const { count: enrollCount } = await supabase
  .from('enrollments')
  .select('*', { count: 'exact', head: true })
  .eq('student_id', STUDENT_ID);

const { count: notifCount } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('student_id', STUDENT_ID);

console.log(`   Enrollments: ${enrollCount || 0}`);
console.log(`   Notifications: ${notifCount || 0}`);

console.log('\n🎉 Done! Refresh your browser!');
