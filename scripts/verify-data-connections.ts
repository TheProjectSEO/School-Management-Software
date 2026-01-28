import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        DATA CONNECTION VERIFICATION                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Check School
  console.log('=== 1. SCHOOL ===\n');
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', targetSchoolId)
    .single();

  console.log('School:', school?.name);
  console.log('ID:', school?.id);
  console.log('Status:', school ? '✅ EXISTS' : '❌ NOT FOUND');

  // 2. Check Teachers in School
  console.log('\n=== 2. TEACHERS IN SCHOOL ===\n');
  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id')
    .eq('school_id', targetSchoolId);

  console.log('Teachers found:', teachers?.length || 0);

  // Get teacher details from profiles
  for (const t of teachers?.slice(0, 3) || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', t.profile_id)
      .single();

    console.log('  -', profile?.full_name || 'N/A', '|', profile?.email || 'No email');
  }
  if ((teachers?.length || 0) > 3) {
    console.log('  ... and', (teachers?.length || 0) - 3, 'more');
  }

  // 3. Check Section
  console.log('\n=== 3. SECTION ===\n');
  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .single();

  console.log('Section:', section?.name);
  console.log('School ID:', section?.school_id);
  console.log('School Match:', section?.school_id === targetSchoolId ? '✅ YES' : '❌ NO');

  // 4. Check Students in Section
  console.log('\n=== 4. STUDENTS IN SECTION ===\n');
  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id, school_id')
    .eq('section_id', sectionId)
    .eq('status', 'active');

  console.log('Students found:', students?.length || 0);

  // Verify all students have same school
  const wrongSchool = students?.filter(s => s.school_id !== targetSchoolId) || [];
  console.log('Students in correct school:', (students?.length || 0) - wrongSchool.length);
  console.log('Students in wrong school:', wrongSchool.length);

  // 5. Check Courses for Section
  console.log('\n=== 5. COURSES FOR SECTION ===\n');
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, teacher_id, school_id')
    .eq('section_id', sectionId);

  console.log('Courses found:', courses?.length || 0);

  const coursesWithTeacher = courses?.filter(c => c.teacher_id) || [];
  const coursesWithoutTeacher = courses?.filter(c => !c.teacher_id) || [];

  console.log('With teacher:', coursesWithTeacher.length);
  console.log('Without teacher:', coursesWithoutTeacher.length);

  // Verify courses are in correct school
  const coursesWrongSchool = courses?.filter(c => c.school_id !== targetSchoolId) || [];
  console.log('Courses in correct school:', (courses?.length || 0) - coursesWrongSchool.length);

  // 6. Check Enrollments
  console.log('\n=== 6. ENROLLMENTS ===\n');
  const studentIds = students?.map(s => s.id) || [];
  const courseIds = courses?.map(c => c.id) || [];

  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .in('student_id', studentIds)
    .in('course_id', courseIds);

  const expected = studentIds.length * courseIds.length;
  console.log('Expected enrollments:', expected, `(${studentIds.length} students × ${courseIds.length} courses)`);
  console.log('Actual enrollments:', enrollmentCount || 0);
  console.log('Status:', enrollmentCount === expected ? '✅ COMPLETE' : '❌ INCOMPLETE');

  // 7. Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const issues = [];

  if (!school) issues.push('School not found');
  if (!teachers?.length) issues.push('No teachers in school');
  if (coursesWithoutTeacher.length > 0) issues.push(`${coursesWithoutTeacher.length} courses without teacher`);
  if (wrongSchool.length > 0) issues.push(`${wrongSchool.length} students in wrong school`);
  if (coursesWrongSchool.length > 0) issues.push(`${coursesWrongSchool.length} courses in wrong school`);
  if (enrollmentCount !== expected) issues.push('Incomplete enrollments');

  if (issues.length === 0) {
    console.log('║  ✅ All data connections are working correctly!              ║');
  } else {
    console.log('║  ⚠️  Issues found:                                           ║');
    issues.forEach(issue => {
      console.log(`║    - ${issue.padEnd(52)} ║`);
    });
  }

  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  return { teachers, courses, students, issues };
}

verify();
