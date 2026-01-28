import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  // Get all Grade 12 STEM A sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .ilike('name', '%12%STEM A%');

  console.log('\n=== GRADE 12 STEM A SECTIONS ===\n');
  sections?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} - ID: ${s.id} - School: ${s.school_id}`);
  });

  if (!sections || sections.length === 0) {
    console.log('No sections found');
    return;
  }

  // Check which section has students assigned
  for (const section of sections) {
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', section.id);

    console.log(`   Students in ${section.name}: ${count || 0}`);
  }

  // Get Grade 12 students and their actual section assignments
  console.log('\n=== GRADE 12 STUDENTS & THEIR SECTIONS ===\n');

  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      grade_level,
      section_id,
      school_id,
      profile:profile_id (
        full_name
      ),
      section:section_id (
        name
      )
    `)
    .or('grade_level.eq.12,grade_level.ilike.%12%')
    .eq('status', 'active')
    .limit(30);

  students?.forEach((s: any, i) => {
    console.log(`${i + 1}. ${s.profile?.full_name || 'N/A'}`);
    console.log(`   LRN: ${s.lrn || 'N/A'}`);
    console.log(`   Section: ${s.section?.name || 'NOT ASSIGNED'}`);
    console.log(`   Section ID: ${s.section_id || 'NULL'}`);
    console.log('');
  });

  // Check enrollments for Grade 12 students
  console.log('=== ENROLLMENTS FOR GRADE 12 STUDENTS ===\n');

  const studentIds = students?.map((s: any) => s.id) || [];

  if (studentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        course:course_id (
          id,
          name,
          subject_code,
          section_id,
          section:section_id (
            name
          )
        )
      `)
      .in('student_id', studentIds.slice(0, 5)); // Just first 5 for brevity

    // Group by student
    const byStudent = new Map<string, any[]>();
    enrollments?.forEach((e: any) => {
      if (!byStudent.has(e.student_id)) {
        byStudent.set(e.student_id, []);
      }
      byStudent.get(e.student_id)?.push(e.course);
    });

    for (const [studentId, courses] of byStudent) {
      const student = students?.find((s: any) => s.id === studentId);
      const profile = (student?.profile as unknown as { full_name: string } | { full_name: string }[] | null);
      const fullName = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
      console.log(`${fullName || studentId}:`);
      courses.forEach((c: any) => {
        console.log(`   - ${c?.name} (${c?.section?.name || 'No section'})`);
      });
      console.log('');
    }
  }

  // Get courses for Grade 12 STEM A section
  console.log('=== COURSES FOR GRADE 12 STEM A ===\n');

  const sectionId = sections[0]?.id;
  if (sectionId) {
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        subject_code,
        teacher:teacher_id (
          id,
          profile:profile_id (
            full_name
          )
        )
      `)
      .eq('section_id', sectionId);

    if (courses && courses.length > 0) {
      courses.forEach((c: any, i) => {
        console.log(`${i + 1}. ${c.name} (${c.subject_code || 'N/A'})`);
        console.log(`   Teacher: ${c.teacher?.profile?.full_name || 'Not assigned'}`);
      });
    } else {
      console.log('No courses found for this section.');

      // Check all courses
      const { data: allCourses } = await supabase
        .from('courses')
        .select('id, name, section_id')
        .limit(10);

      console.log('\nSample courses in system:');
      allCourses?.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name} - Section ID: ${c.section_id || 'NULL'}`);
      });
    }
  }
}

check();
