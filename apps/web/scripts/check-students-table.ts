import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING STUDENTS TABLE ===\n');

  const cols = ['id', 'profile_id', 'student_number', 'school_id', 'grade_level', 'section_id', 'student_id_number'];
  for (const col of cols) {
    const { error } = await supabase.from('students').select(col).limit(1);
    if (error) {
      console.log(`  ${col}: ❌`);
    } else {
      console.log(`  ${col}: ✅`);
    }
  }

  // Get a sample student
  const { data: sample, error } = await supabase
    .from('students')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('\nError getting sample:', error.message);
  } else if (sample) {
    console.log('\nSample student record:');
    console.log(JSON.stringify(sample, null, 2));
  }

  // Check enrollments status column
  console.log('\n=== CHECKING ENROLLMENTS TABLE ===');
  const enrollCols = ['id', 'student_id', 'section_id', 'school_id', 'status', 'course_id', 'enrolled_at', 'is_active'];
  for (const col of enrollCols) {
    const { error } = await supabase.from('enrollments').select(col).limit(1);
    if (error) {
      console.log(`  ${col}: ❌`);
    } else {
      console.log(`  ${col}: ✅`);
    }
  }

  // Get sample enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .limit(1)
    .single();

  if (enrollment) {
    console.log('\nSample enrollment record:');
    console.log(JSON.stringify(enrollment, null, 2));
  }
}

check();
