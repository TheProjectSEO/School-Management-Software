import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function analyzeSectioning() {
  const supabase = createAdminClient();

  console.log('\n=== SECTIONING ANALYSIS ===\n');

  // Get Grade 12 STEM A section (the main one with students)
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, school_id, grade_level')
    .eq('id', '1c4ca13d-cba8-4219-be47-61bb652c5d4a')
    .single();

  if (!section) {
    console.log('Section not found!');
    return;
  }

  console.log(`Target Section: ${section.name}`);
  console.log(`Section ID: ${section.id}`);
  console.log(`School ID: ${section.school_id}\n`);

  // Get all students in this section
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      school_id,
      profile:profile_id (
        full_name
      )
    `)
    .eq('section_id', section.id)
    .eq('status', 'active');

  console.log(`Students in section: ${students?.length || 0}\n`);

  // Get their current enrollments
  const studentIds = students?.map(s => s.id) || [];

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      course_id,
      course:course_id (
        id,
        name,
        section_id,
        section:section_id (
          name
        )
      )
    `)
    .in('student_id', studentIds);

  // Analyze enrollment sections
  const sectionCounts = new Map<string, { name: string; count: number }>();
  enrollments?.forEach((e: any) => {
    const sectionId = e.course?.section_id || 'null';
    const sectionName = e.course?.section?.name || 'No Section';
    if (!sectionCounts.has(sectionId)) {
      sectionCounts.set(sectionId, { name: sectionName, count: 0 });
    }
    sectionCounts.get(sectionId)!.count++;
  });

  console.log('=== CURRENT ENROLLMENT SECTIONS ===\n');
  for (const [sectionId, info] of sectionCounts) {
    console.log(`${info.name}: ${info.count} enrollments (Section ID: ${sectionId})`);
  }

  // Get courses that exist for Grade 12 STEM A section
  const { data: sectionCourses } = await supabase
    .from('courses')
    .select('id, name, subject_code, teacher_id')
    .eq('section_id', section.id);

  console.log(`\n=== COURSES FOR ${section.name} ===\n`);
  if (!sectionCourses || sectionCourses.length === 0) {
    console.log('NO COURSES EXIST for this section!\n');
    console.log('Need to create courses for Grade 12 STEM A.\n');
  } else {
    sectionCourses.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.subject_code || 'N/A'})`);
    });
  }

  // Get the teacher for this school
  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select(`
      id,
      school_id,
      profile:profile_id (
        full_name
      )
    `)
    .eq('school_id', section.school_id)
    .limit(5);

  console.log('\n=== TEACHERS IN SCHOOL ===\n');
  teachers?.forEach((t: any, i) => {
    console.log(`${i + 1}. ${t.profile?.full_name || 'N/A'} - ID: ${t.id}`);
  });

  return {
    section,
    students,
    enrollments,
    sectionCourses,
    teachers
  };
}

async function fixSectioning() {
  const supabase = createAdminClient();
  const data = await analyzeSectioning();

  if (!data) return;

  const { section, students, teachers } = data;

  console.log('\n=== FIXING SECTIONING ===\n');

  // Step 1: Create STEM courses for Grade 12 STEM A if they don't exist
  const stemCourses = [
    { name: 'General Physics 2', subject_code: 'PHYS2', description: 'Second semester physics for STEM' },
    { name: 'General Chemistry 2', subject_code: 'CHEM2', description: 'Second semester chemistry for STEM' },
    { name: 'General Biology 2', subject_code: 'BIO2', description: 'Second semester biology for STEM' },
    { name: 'Pre-Calculus', subject_code: 'PRECAL', description: 'Pre-Calculus mathematics' },
    { name: 'Basic Calculus', subject_code: 'CALC', description: 'Introduction to Calculus' },
    { name: 'Practical Research 2', subject_code: 'PR2', description: 'Quantitative Research' },
    { name: 'Inquiries, Investigations and Immersion', subject_code: 'III', description: 'Research immersion' },
    { name: 'Physical Education and Health 4', subject_code: 'PE4', description: 'PE for Grade 12' },
    { name: 'Contemporary Philippine Arts', subject_code: 'CPAR', description: 'Philippine arts appreciation' },
    { name: 'Media and Information Literacy', subject_code: 'MIL', description: 'Media literacy course' },
  ];

  // Use the first teacher or null
  const teacherId = teachers?.[0]?.id || null;

  console.log(`Using teacher: ${teachers?.[0]?.profile?.full_name || 'None'}\n`);

  // Check existing courses for this section
  const { data: existingCourses } = await supabase
    .from('courses')
    .select('name')
    .eq('section_id', section.id);

  const existingNames = new Set(existingCourses?.map(c => c.name) || []);

  // Create missing courses
  const coursesToCreate = stemCourses.filter(c => !existingNames.has(c.name));

  if (coursesToCreate.length > 0) {
    console.log(`Creating ${coursesToCreate.length} new courses...\n`);

    for (const course of coursesToCreate) {
      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert({
          name: course.name,
          subject_code: course.subject_code,
          description: course.description,
          section_id: section.id,
          school_id: section.school_id,
          teacher_id: teacherId,
        })
        .select('id, name')
        .single();

      if (error) {
        console.log(`❌ Failed to create ${course.name}: ${error.message}`);
      } else {
        console.log(`✅ Created: ${newCourse.name}`);
      }
    }
  } else {
    console.log('All courses already exist.\n');
  }

  // Step 2: Get all courses for this section
  const { data: sectionCourses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', section.id);

  if (!sectionCourses || sectionCourses.length === 0) {
    console.log('No courses available for enrollment!');
    return;
  }

  console.log(`\n=== ENROLLING STUDENTS ===\n`);
  console.log(`Courses available: ${sectionCourses.length}`);
  console.log(`Students to enroll: ${students?.length || 0}\n`);

  // Step 3: Delete old enrollments and create new ones
  const studentIds = students?.map(s => s.id) || [];

  // Delete existing enrollments for these students
  const { error: deleteError } = await supabase
    .from('enrollments')
    .delete()
    .in('student_id', studentIds);

  if (deleteError) {
    console.log(`⚠️ Error deleting old enrollments: ${deleteError.message}`);
  } else {
    console.log('✅ Cleared old enrollments');
  }

  // Create new enrollments
  let enrollmentCount = 0;
  for (const student of students || []) {
    for (const course of sectionCourses) {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: student.id,
          course_id: course.id,
          school_id: section.school_id,
        });

      if (!error) {
        enrollmentCount++;
      }
    }
  }

  console.log(`✅ Created ${enrollmentCount} enrollments`);
  console.log(`   (${students?.length} students × ${sectionCourses.length} courses)\n`);

  // Verify
  console.log('=== VERIFICATION ===\n');

  const { data: newEnrollments } = await supabase
    .from('enrollments')
    .select(`
      student_id,
      course:course_id (
        name,
        section:section_id (
          name
        )
      )
    `)
    .in('student_id', studentIds.slice(0, 3));

  // Group by student
  const byStudent = new Map<string, string[]>();
  newEnrollments?.forEach((e: any) => {
    if (!byStudent.has(e.student_id)) {
      byStudent.set(e.student_id, []);
    }
    byStudent.get(e.student_id)?.push(`${e.course?.name} (${e.course?.section?.name})`);
  });

  for (const [studentId, courses] of byStudent) {
    const student = students?.find(s => s.id === studentId);
    console.log(`${(student as any)?.profile?.full_name}:`);
    courses.slice(0, 5).forEach(c => console.log(`   ✅ ${c}`));
    if (courses.length > 5) console.log(`   ... and ${courses.length - 5} more`);
    console.log('');
  }

  console.log('=== DONE ===\n');
}

// Run the fix
fixSectioning();
