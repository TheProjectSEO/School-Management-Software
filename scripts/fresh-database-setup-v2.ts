import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function freshSetup() {
  const supabase = createAdminClient();
  const schoolId = '11111111-1111-1111-1111-111111111111'; // Mindanao State University
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a'; // Grade 12 STEM A

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           FRESH DATABASE SETUP v2                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ========== PHASE 1: CLEANUP ==========
  console.log('=== PHASE 1: CLEANUP ===\n');

  // 1. Delete enrollments
  console.log('1. Deleting enrollments...');
  await supabase.from('enrollments').delete().eq('school_id', schoolId);
  console.log('   ✅ Done');

  // 2. Delete submissions
  console.log('2. Deleting submissions...');
  await supabase.from('submissions').delete().not('id', 'is', null);
  console.log('   ✅ Done');

  // 3. Delete assessment questions
  console.log('3. Deleting assessment questions...');
  await supabase.from('teacher_assessment_questions').delete().not('id', 'is', null);
  await supabase.from('questions').delete().not('id', 'is', null);
  console.log('   ✅ Done');

  // 4. Delete assessments
  console.log('4. Deleting assessments...');
  await supabase.from('assessments').delete().eq('school_id', schoolId);
  console.log('   ✅ Done');

  // 5. Delete live sessions
  console.log('5. Deleting live sessions...');
  const { data: courses } = await supabase.from('courses').select('id').eq('school_id', schoolId);
  const courseIds = courses?.map(c => c.id) || [];
  if (courseIds.length > 0) {
    await supabase.from('live_sessions').delete().in('course_id', courseIds);
  }
  console.log('   ✅ Done');

  // 6. Delete student_applications first (foreign key)
  console.log('6. Deleting student applications...');
  await supabase.from('student_applications').delete().not('id', 'is', null);
  console.log('   ✅ Done');

  // 7. Delete students
  console.log('7. Deleting students...');
  await supabase.from('students').delete().eq('school_id', schoolId);
  console.log('   ✅ Done');

  // 8. Reset course teachers
  console.log('8. Resetting course teachers...');
  await supabase.from('courses').update({ teacher_id: null }).eq('section_id', sectionId);
  console.log('   ✅ Done');

  // 9. Reset section adviser
  console.log('9. Resetting section adviser...');
  await supabase.from('sections').update({ adviser_teacher_id: null }).eq('id', sectionId);
  console.log('   ✅ Done');

  console.log('\n✅ Cleanup complete!\n');

  // ========== PHASE 2: CREATE STUDENTS ==========
  console.log('=== PHASE 2: CREATE 10 STUDENT ACCOUNTS ===\n');

  // Names without spaces in last name for email
  const studentData = [
    { firstName: 'Maria', lastName: 'Santos', lrn: '2026-MSU-0001' },
    { firstName: 'Juan', lastName: 'Reyes', lrn: '2026-MSU-0002' },
    { firstName: 'Ana', lastName: 'Garcia', lrn: '2026-MSU-0003' },
    { firstName: 'Carlos', lastName: 'Lopez', lrn: '2026-MSU-0004' },
    { firstName: 'Sofia', lastName: 'Martinez', lrn: '2026-MSU-0005' },
    { firstName: 'Miguel', lastName: 'Fernandez', lrn: '2026-MSU-0006' },
    { firstName: 'Isabella', lastName: 'Cruz', lrn: '2026-MSU-0007' },
    { firstName: 'Gabriel', lastName: 'Villanueva', lrn: '2026-MSU-0008' },
    { firstName: 'Elena', lastName: 'Mendoza', lrn: '2026-MSU-0009' },
    { firstName: 'Paolo', lastName: 'Ignacio', lrn: '2026-MSU-0010' },
  ];

  const createdStudents: { id: string; name: string; email: string }[] = [];
  const password = 'Student123!';

  for (const student of studentData) {
    const fullName = `${student.firstName} ${student.lastName}`;
    const email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@msu.edu.ph`;

    console.log(`Creating: ${fullName} (${email})`);

    try {
      // 1. Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      let authUserId: string;

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // Find existing user
          const { data: users } = await supabase.auth.admin.listUsers();
          const existing = users?.users?.find(u => u.email === email);
          if (existing) {
            authUserId = existing.id;
            console.log(`   ⚠️ Using existing auth user`);
          } else {
            console.log(`   ❌ ${authError.message}`);
            continue;
          }
        } else {
          console.log(`   ❌ ${authError.message}`);
          continue;
        }
      } else {
        authUserId = authUser!.user!.id;
      }

      // 2. Create/update profile (without role column)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUserId,
          email: email,
          full_name: fullName,
        });

      if (profileError) {
        console.log(`   ❌ Profile: ${profileError.message}`);
        continue;
      }

      // 3. Create school_profile
      const { data: schoolProfile, error: spError } = await supabase
        .from('school_profiles')
        .upsert({
          auth_user_id: authUserId,
          full_name: fullName,
          role: 'student',
        }, { onConflict: 'auth_user_id' })
        .select()
        .single();

      if (spError) {
        console.log(`   ❌ School profile: ${spError.message}`);
        continue;
      }

      // 4. Create student record
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .insert({
          profile_id: schoolProfile.id,
          school_id: schoolId,
          section_id: sectionId,
          lrn: student.lrn,
          grade_level: '12',
          status: 'active',
        })
        .select()
        .single();

      if (studentError) {
        console.log(`   ❌ Student: ${studentError.message}`);
        continue;
      }

      console.log(`   ✅ Created (ID: ${studentRecord.id})`);
      createdStudents.push({ id: studentRecord.id, name: fullName, email: email });

    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  // ========== PHASE 3: ENROLL STUDENTS ==========
  console.log('\n=== PHASE 3: ENROLL STUDENTS IN COURSES ===\n');

  const { data: sectionCourses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', sectionId);

  console.log('Courses available:', sectionCourses?.length || 0);
  console.log('Students to enroll:', createdStudents.length);

  if (sectionCourses && sectionCourses.length > 0 && createdStudents.length > 0) {
    const enrollments = [];

    for (const student of createdStudents) {
      for (const course of sectionCourses) {
        enrollments.push({
          student_id: student.id,
          course_id: course.id,
          school_id: schoolId,
          status: 'active',
        });
      }
    }

    const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);

    if (enrollError) {
      console.log('❌ Enrollment error:', enrollError.message);
    } else {
      console.log(`✅ Created ${enrollments.length} enrollments`);
    }
  }

  // ========== SUMMARY ==========
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SETUP COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('School: Mindanao State University');
  console.log('Section: Grade 12 - STEM A');
  console.log('Courses:', sectionCourses?.length || 0);
  console.log('Students Created:', createdStudents.length);
  console.log('');

  if (createdStudents.length > 0) {
    console.log('┌────────────────────────────────────────────────────────────┐');
    console.log('│ STUDENT ACCOUNTS                                           │');
    console.log('├────────────────────────────────────────────────────────────┤');
    console.log('│ Default Password: Student123!                              │');
    console.log('├────────────────────────────────────────────────────────────┤');

    createdStudents.forEach((s, i) => {
      const num = String(i + 1).padStart(2, ' ');
      console.log(`│ ${num}. ${s.email.padEnd(40)} │`);
    });

    console.log('└────────────────────────────────────────────────────────────┘');
  }

  console.log('\n=== NEXT STEPS ===\n');
  console.log('1. Create a Teacher account in the admin panel');
  console.log('2. Assign the teacher to Grade 12 STEM A courses');
  console.log('3. Login as student to test visibility');
}

freshSetup();
