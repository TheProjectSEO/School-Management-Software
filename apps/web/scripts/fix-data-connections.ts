import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== FIXING DATA CONNECTIONS ===\n');

  // 1. Fix students' school_id
  console.log('1. Fixing students school_id...\n');

  const { data: students } = await supabase
    .from('students')
    .select('id, school_id')
    .eq('section_id', sectionId);

  const studentsToFix = students?.filter(s => s.school_id !== targetSchoolId) || [];
  console.log('   Students to fix:', studentsToFix.length);

  if (studentsToFix.length > 0) {
    const { error: studentError } = await supabase
      .from('students')
      .update({ school_id: targetSchoolId })
      .eq('section_id', sectionId);

    if (studentError) {
      console.log('   ❌ Error:', studentError.message);
    } else {
      console.log('   ✅ Updated', studentsToFix.length, 'students to correct school');
    }
  }

  // 2. Get a teacher to assign to courses
  console.log('\n2. Assigning teacher to courses...\n');

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id')
    .eq('school_id', targetSchoolId)
    .limit(1);

  if (!teachers || teachers.length === 0) {
    console.log('   ❌ No teachers found in school!');
    return;
  }

  const teacherId = teachers[0].id;
  console.log('   Using teacher ID:', teacherId);

  // Get teacher name if possible
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', teachers[0].profile_id)
    .single();

  console.log('   Teacher name:', profile?.full_name || 'N/A');

  // 3. Assign teacher to all courses in section
  const { data: updatedCourses, error: courseError } = await supabase
    .from('courses')
    .update({ teacher_id: teacherId })
    .eq('section_id', sectionId)
    .is('teacher_id', null)
    .select('id, name');

  if (courseError) {
    console.log('   ❌ Error assigning teacher:', courseError.message);
  } else {
    console.log('   ✅ Assigned teacher to', updatedCourses?.length || 0, 'courses');
  }

  // 4. Also update enrollments school_id if needed
  console.log('\n3. Fixing enrollments school_id...\n');

  const studentIds = students?.map(s => s.id) || [];

  const { error: enrollError } = await supabase
    .from('enrollments')
    .update({ school_id: targetSchoolId })
    .in('student_id', studentIds);

  if (enrollError) {
    console.log('   ❌ Error:', enrollError.message);
  } else {
    console.log('   ✅ Updated enrollments school_id');
  }

  console.log('\n=== DONE ===\n');
}

fix();
