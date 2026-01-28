#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Checking database...\n');

// Check schools
const { data: schools, error: schoolError } = await supabase
  .from('schools')
  .select('*')
  .eq('id', '11111111-1111-1111-1111-111111111111');

console.log('School:', schools?.length ? schools[0].name : 'NOT FOUND');
if (schoolError) console.log('School error:', schoolError.message);

// Check sections
const { data: sections, error: sectionError } = await supabase
  .from('sections')
  .select('*')
  .eq('id', '22222222-2222-2222-2222-222222222222');

console.log('Section:', sections?.length ? sections[0].name : 'NOT FOUND');
if (sectionError) console.log('Section error:', sectionError.message);

// Check courses
const { data: courses, error: courseError } = await supabase
  .from('courses')
  .select('count');

console.log('Courses:', courses?.[0]?.count || 0);
if (courseError) console.log('Course error:', courseError.message);
