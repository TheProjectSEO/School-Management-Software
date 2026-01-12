#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyTables() {
  console.log('🔍 Verifying database tables...\n');

  const tables = ['schools', 'sections', 'courses', 'students', 'enrollments', 'modules', 'lessons', 'assessments', 'notifications', 'notes'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Table exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n🔍 Checking existing data...\n');

  // Check for existing school
  const { data: schools, error: schoolsError } = await supabase
    .from('schools')
    .select('*');

  if (!schoolsError) {
    console.log(`📚 Found ${schools?.length || 0} schools`);
    if (schools && schools.length > 0) {
      schools.forEach(school => {
        console.log(`   - ${school.name} (${school.id})`);
      });
    }
  }

  // Check for existing student
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', '44d7c894-d749-4e15-be1b-f42afe6f8c27');

  if (!studentsError) {
    console.log(`\n👨‍🎓 Found ${students?.length || 0} students with profile_id 44d7c894-d749-4e15-be1b-f42afe6f8c27`);
    if (students && students.length > 0) {
      students.forEach(student => {
        console.log(`   - Student ID: ${student.id}, LRN: ${student.lrn}`);
      });
    }
  }

  // Check for existing courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('*');

  if (!coursesError) {
    console.log(`\n📖 Found ${courses?.length || 0} courses`);
    if (courses && courses.length > 0) {
      courses.slice(0, 5).forEach(course => {
        console.log(`   - ${course.name} (${course.subject_code})`);
      });
      if (courses.length > 5) {
        console.log(`   ... and ${courses.length - 5} more`);
      }
    }
  }
}

verifyTables();
