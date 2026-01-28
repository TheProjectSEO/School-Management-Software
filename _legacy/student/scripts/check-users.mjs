#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Checking Supabase database for existing users...\n');

// Try to get profiles
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, student_id')
  .limit(5);

if (error) {
  console.log('❌ Error fetching profiles:', error.message);
} else {
  console.log('✅ Profiles table:', data?.length || 0, 'records');
  if (data && data.length > 0) {
    console.log(JSON.stringify(data, null, 2));
  }
}

console.log('');

// Try to get students
const { data: students, error: studentsError } = await supabase
  .from('students')
  .select('id, full_name, student_id, email')
  .limit(5);

if (studentsError) {
  console.log('❌ Error fetching students:', studentsError.message);
} else {
  console.log('✅ Students table:', students?.length || 0, 'records');
  if (students && students.length > 0) {
    console.log(JSON.stringify(students, null, 2));
  }
}
