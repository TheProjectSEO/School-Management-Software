import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING ENROLLMENT QUERY ===\n');

  // First, check what tables exist
  const tables = ['students', 'student_profiles', 'enrollments'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`${table}: ❌ ${error.message.substring(0, 50)}`);
    } else {
      console.log(`${table}: ✅ Exists`);
    }
  }

  // Check enrollments structure
  console.log('\n=== Enrollments Table Columns ===');
  const enrollmentCols = ['id', 'student_id', 'section_id', 'school_id', 'status', 'course_id'];
  for (const col of enrollmentCols) {
    const { error } = await supabase.from('enrollments').select(col).limit(1);
    if (error) {
      console.log(`  ${col}: ❌`);
    } else {
      console.log(`  ${col}: ✅`);
    }
  }

  // Try different query patterns
  console.log('\n=== Testing Query Patterns ===');

  // Pattern 1: students table
  const { data: data1, error: error1 } = await supabase
    .from('enrollments')
    .select(`
      student_id,
      student:students(id, student_number)
    `)
    .limit(1);

  if (error1) {
    console.log('Pattern 1 (students table):', error1.message.substring(0, 80));
  } else {
    console.log('Pattern 1 (students table): ✅ Works');
    console.log('  Sample:', JSON.stringify(data1?.[0])?.substring(0, 100));
  }

  // Pattern 2: student_profiles table
  const { data: data2, error: error2 } = await supabase
    .from('enrollments')
    .select(`
      student_id,
      student:student_profiles(id, profile_id)
    `)
    .limit(1);

  if (error2) {
    console.log('Pattern 2 (student_profiles):', error2.message.substring(0, 80));
  } else {
    console.log('Pattern 2 (student_profiles): ✅ Works');
    console.log('  Sample:', JSON.stringify(data2?.[0])?.substring(0, 100));
  }
}

check();
