import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function listSectionStudents() {
  const supabase = createAdminClient();

  // Find Grade 12 STEM A section
  const { data: sections, error: sectionError } = await supabase
    .from('sections')
    .select('id, name, grade_level, adviser_teacher_id')
    .or('name.ilike.%STEM A%,name.ilike.%STEM-A%,name.ilike.%12 STEM A%')
    .limit(10);

  if (sectionError) {
    console.error('Error finding sections:', sectionError.message);
    return;
  }

  console.log('\n=== SECTIONS FOUND ===\n');
  if (!sections || sections.length === 0) {
    console.log('No STEM A sections found. Listing all sections...\n');

    const { data: allSections } = await supabase
      .from('sections')
      .select('id, name, grade_level')
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    allSections?.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (Grade: ${s.grade_level || 'N/A'})`);
    });
    return;
  }

  sections.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (Grade: ${s.grade_level || 'N/A'}) - ID: ${s.id}`);
  });

  // Use the first matching section
  const section = sections[0];
  console.log(`\n=== STUDENTS IN: ${section.name} ===\n`);

  // Get students in this section
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      status,
      profile:profile_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .eq('section_id', section.id)
    .eq('status', 'active');

  if (studentsError) {
    console.error('Error fetching students:', studentsError.message);
    return;
  }

  if (!students || students.length === 0) {
    console.log('No students found in this section.');

    // Try to find students by grade level instead
    console.log('\nSearching for Grade 12 students...\n');
    const { data: grade12Students } = await supabase
      .from('students')
      .select(`
        id,
        lrn,
        section_id,
        grade_level,
        status,
        profile:profile_id (
          id,
          full_name
        )
      `)
      .or('grade_level.eq.12,grade_level.ilike.%12%,grade_level.ilike.%Grade 12%')
      .eq('status', 'active')
      .limit(20);

    grade12Students?.forEach((s: any, i) => {
      console.log(`${i + 1}. ${s.profile?.full_name || 'N/A'} - LRN: ${s.lrn || 'N/A'} - Grade: ${s.grade_level}`);
    });
    return;
  }

  // List students
  for (let i = 0; i < students.length; i++) {
    const s: any = students[i];
    let email = 'N/A';
    if (s.profile?.auth_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(s.profile.auth_user_id);
      email = authUser?.user?.email || 'N/A';
    }
    console.log(`${i + 1}. ${s.profile?.full_name || 'N/A'}`);
    console.log(`   Email: ${email}`);
    console.log(`   LRN: ${s.lrn || 'N/A'}`);
    console.log('');
  }

  console.log(`Total: ${students.length} students\n`);

  // Get courses/subjects for this section
  console.log('=== SUBJECTS FOR THIS SECTION ===\n');

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      subject_code,
      teacher_id,
      teacher:teacher_id (
        id,
        profile:profile_id (
          full_name
        )
      )
    `)
    .eq('section_id', section.id);

  if (coursesError) {
    console.error('Error fetching courses:', coursesError.message);
    return;
  }

  if (!courses || courses.length === 0) {
    console.log('No courses found for this section.');
    return;
  }

  courses.forEach((c: any, i) => {
    const teacherName = c.teacher?.profile?.full_name || 'No teacher assigned';
    console.log(`${i + 1}. ${c.name} (${c.subject_code || 'N/A'})`);
    console.log(`   Teacher: ${teacherName}`);
    console.log('');
  });

  console.log(`Total: ${courses.length} subjects\n`);

  // Verify enrollments
  console.log('=== ENROLLMENT VERIFICATION ===\n');

  const studentIds = students.map((s: any) => s.id);
  const courseIds = courses.map((c: any) => c.id);

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('student_id, course_id')
    .in('student_id', studentIds)
    .in('course_id', courseIds);

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError.message);
    return;
  }

  // Build enrollment matrix
  const enrollmentMap = new Map<string, Set<string>>();
  enrollments?.forEach((e: any) => {
    if (!enrollmentMap.has(e.student_id)) {
      enrollmentMap.set(e.student_id, new Set());
    }
    enrollmentMap.get(e.student_id)?.add(e.course_id);
  });

  // Check each student
  let allMatch = true;
  students.forEach((s: any) => {
    const studentCourses = enrollmentMap.get(s.id) || new Set();
    const enrolled = courseIds.filter((cid: string) => studentCourses.has(cid));
    const missing = courseIds.filter((cid: string) => !studentCourses.has(cid));

    if (missing.length > 0) {
      allMatch = false;
      console.log(`⚠️  ${s.profile?.full_name}: Missing ${missing.length} subjects`);
      missing.forEach((cid: string) => {
        const course = courses.find((c: any) => c.id === cid);
        console.log(`    - ${course?.name || cid}`);
      });
    } else {
      console.log(`✅ ${s.profile?.full_name}: Enrolled in all ${enrolled.length} subjects`);
    }
  });

  if (allMatch) {
    console.log('\n✅ All students are enrolled in the same subjects!');
  } else {
    console.log('\n⚠️  Some students have missing enrollments.');
  }
}

listSectionStudents();
