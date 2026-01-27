import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function enrollStudents() {
  const supabase = createAdminClient();
  const schoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== ENROLLING STUDENTS ===\n');

  // Get all students in section
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('section_id', sectionId)
    .eq('status', 'active');

  console.log('Students found:', students?.length || 0);

  // Get all courses in section
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('section_id', sectionId);

  console.log('Courses found:', courses?.length || 0);

  if (!students?.length || !courses?.length) {
    console.log('No students or courses to enroll');
    return;
  }

  // Create enrollments (without status column)
  const enrollments = [];
  for (const student of students) {
    for (const course of courses) {
      enrollments.push({
        student_id: student.id,
        course_id: course.id,
        school_id: schoolId,
      });
    }
  }

  console.log('Creating', enrollments.length, 'enrollments...');

  const { error } = await supabase.from('enrollments').insert(enrollments);

  if (error) {
    console.log('Error:', error.message);

    // Try one by one to see what columns are needed
    console.log('\nTrying single insert to check schema...');
    const { error: singleError } = await supabase
      .from('enrollments')
      .insert({
        student_id: students[0].id,
        course_id: courses[0].id,
        school_id: schoolId,
      });

    if (singleError) {
      console.log('Single insert error:', singleError.message);
    } else {
      console.log('Single insert worked! Continuing...');

      // Insert rest
      for (let i = 0; i < enrollments.length; i++) {
        if (i === 0) continue; // Skip first, already inserted
        await supabase.from('enrollments').insert(enrollments[i]);
      }
      console.log('✅ Inserted all enrollments one by one');
    }
  } else {
    console.log('✅ All enrollments created!');
  }

  // Verify
  const { count } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  console.log('\nTotal enrollments:', count);
}

enrollStudents();
