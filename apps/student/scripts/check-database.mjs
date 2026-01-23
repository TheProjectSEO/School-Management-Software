#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking database tables...\n');

// Check students table
console.log('1. Checking students table:');
const { data: students, error: studentsError } = await supabase
  .from('students')
  .select('*')
  .limit(5);

if (studentsError) {
  console.error('   Error:', studentsError.message);
} else {
  console.log(`   Found ${students?.length || 0} students`);
  if (students && students.length > 0) {
    console.log('   First student:', JSON.stringify(students[0], null, 2));
  }
}

// Check profiles table
console.log('\n2. Checking profiles table:');
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('*')
  .limit(5);

if (profilesError) {
  console.error('   Error:', profilesError.message);
} else {
  console.log(`   Found ${profiles?.length || 0} profiles`);
  if (profiles && profiles.length > 0) {
    console.log('   First profile:', JSON.stringify(profiles[0], null, 2));
  }
}

// Check schools table
console.log('\n3. Checking schools table:');
const { data: schools, error: schoolsError } = await supabase
  .from('schools')
  .select('*')
  .limit(5);

if (schoolsError) {
  console.error('   Error:', schoolsError.message);
} else {
  console.log(`   Found ${schools?.length || 0} schools`);
  if (schools && schools.length > 0) {
    console.log('   First school:', JSON.stringify(schools[0], null, 2));
  }
}

// Check if announcements table exists
console.log('\n4. Checking announcements table:');
const { data: announcements, error: announcementsError } = await supabase
  .from('announcements')
  .select('id')
  .limit(1);

if (announcementsError) {
  console.error('   Error:', announcementsError.message);
  console.log('   Table might not exist yet.');
} else {
  console.log(`   Table exists! Found ${announcements?.length || 0} announcements`);
}

// Check if notifications table exists
console.log('\n5. Checking notifications table:');
const { data: notifications, error: notificationsError } = await supabase
  .from('notifications')
  .select('id')
  .limit(1);

if (notificationsError) {
  console.error('   Error:', notificationsError.message);
  console.log('   Already exists in schema');
} else {
  console.log(`   Found ${notifications?.length || 0} notifications`);
}
