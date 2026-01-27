import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          GRADE 12 STEM A - FINAL VERIFICATION                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  // Get section info
  const { data: section } = await supabase
    .from('sections')
    .select('name, grade_level')
    .eq('id', sectionId)
    .single();

  console.log(`Section: ${section?.name}`);
  console.log(`Grade Level: ${section?.grade_level}\n`);

  // Get students
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      profile:profile_id (
        full_name,
        auth_user_id
      )
    `)
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .order('lrn', { ascending: true });

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STUDENTS                                                     │');
  console.log('├─────────────────────────────────────────────────────────────┤');

  for (let i = 0; i < (students?.length || 0); i++) {
    const s: any = students![i];
    let email = '';
    if (s.profile?.auth_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(s.profile.auth_user_id);
      email = authUser?.user?.email || '';
    }
    const name = (s.profile?.full_name || 'N/A').padEnd(25);
    const lrn = (s.lrn || 'N/A').padEnd(15);
    console.log(`│ ${String(i + 1).padStart(2)}. ${name} LRN: ${lrn} │`);
  }

  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log(`\nTotal Students: ${students?.length || 0}\n`);

  // Get courses (simplified query - teacher join not working)
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, subject_code, teacher_id')
    .eq('section_id', sectionId)
    .order('name', { ascending: true });

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ SUBJECTS                                                     │');
  console.log('├─────────────────────────────────────────────────────────────┤');

  courses?.forEach((c: any, i) => {
    const name = c.name.padEnd(35);
    const code = (c.subject_code || 'N/A').padEnd(15);
    const hasTeacher = c.teacher_id ? 'Assigned' : 'No teacher';
    console.log(`│ ${String(i + 1).padStart(2)}. ${name} │`);
    console.log(`│     Code: ${code} Teacher: ${hasTeacher.padEnd(20)} │`);
  });

  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log(`\nTotal Subjects: ${courses?.length || 0}\n`);

  // Verify all students have same enrollments
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ ENROLLMENT VERIFICATION                                      │');
  console.log('├─────────────────────────────────────────────────────────────┤');

  const studentIds = students?.map(s => s.id) || [];
  const courseIds = courses?.map(c => c.id) || [];

  let allMatch = true;
  for (const student of students || []) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .in('course_id', courseIds);

    const expected = courseIds.length;
    const actual = count || 0;
    const status = actual === expected ? '✅' : '❌';

    if (actual !== expected) {
      allMatch = false;
      console.log(`│ ${status} ${(student as any).profile?.full_name}: ${actual}/${expected} subjects │`);
    }
  }

  if (allMatch) {
    console.log(`│ ✅ All ${students?.length} students enrolled in all ${courses?.length} subjects │`);
  }

  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Check for cross-section enrollments (check enrollments not in section courses)
  const { data: allEnrollments } = await supabase
    .from('enrollments')
    .select('student_id, course_id')
    .in('student_id', studentIds);

  // Filter enrollments that are NOT in the section's courses
  const crossEnrollments = allEnrollments?.filter(e => !courseIds.includes(e.course_id)) || [];

  if (crossEnrollments.length > 0) {
    console.log(`⚠️ WARNING: ${crossEnrollments.length} cross-section enrollments found!`);
  } else {
    console.log('✅ No cross-section enrollments. All students in single section.\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

verify();
