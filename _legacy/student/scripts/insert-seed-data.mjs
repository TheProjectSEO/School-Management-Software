#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🌱 Inserting seed data...\n');

// Insert school
console.log('Inserting school...');
const { error: schoolError } = await supabase
  .from('schools')
  .upsert({
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'msu-main',
    name: 'Mindanao State University - Main Campus',
    region: 'Region X',
    division: 'Marawi City',
    logo_url: '/brand/logo.png',
    accent_color: '#7B1113'
  }, { onConflict: 'id' });

if (schoolError) {
  console.error('❌ School error:', schoolError.message);
} else {
  console.log('✅ School inserted');
}

// Insert section
console.log('Inserting section...');
const { error: sectionError } = await supabase
  .from('sections')
  .upsert({
    id: '22222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    name: 'BSCS 2-A',
    grade_level: 'College - 2nd Year'
  }, { onConflict: 'id' });

if (sectionError) {
  console.error('❌ Section error:', sectionError.message);
} else {
  console.log('✅ Section inserted');
}

// Insert courses
console.log('Inserting courses...');
const courses = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Web Development Fundamentals',
    subject_code: 'CS 201',
    description: 'Learn HTML, CSS, and JavaScript',
    cover_image_url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Data Structures and Algorithms',
    subject_code: 'CS 202',
    description: 'Master data structures',
    cover_image_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Philippine History',
    subject_code: 'HIST 101',
    description: 'Philippine history',
    cover_image_url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800'
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Calculus I',
    subject_code: 'MATH 201',
    description: 'Differential calculus',
    cover_image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800'
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'English Communication',
    subject_code: 'ENG 102',
    description: 'Technical writing',
    cover_image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800'
  }
];

const { error: coursesError } = await supabase
  .from('courses')
  .upsert(courses, { onConflict: 'id' });

if (coursesError) {
  console.error('❌ Courses error:', coursesError.message);
} else {
  console.log('✅ 5 courses inserted');
}

console.log('\n✅ Seed data complete!');
