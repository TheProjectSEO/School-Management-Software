import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function freshSetup() {
  const supabase = createAdminClient();
  const schoolId = '11111111-1111-1111-1111-111111111111'; // Mindanao State University
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a'; // Grade 12 STEM A

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           FRESH DATABASE SETUP                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ========== PHASE 1: CLEANUP ==========
  console.log('=== PHASE 1: CLEANUP ===\n');

  // 1. Delete enrollments
  console.log('1. Deleting enrollments...');
  const { error: enrollError } = await supabase
    .from('enrollments')
    .delete()
    .eq('school_id', schoolId);
  console.log(enrollError ? `   ❌ ${enrollError.message}` : '   ✅ Deleted');

  // 2. Delete submissions
  console.log('2. Deleting submissions...');
  const { error: subError } = await supabase
    .from('submissions')
    .delete()
    .not('id', 'is', null); // Delete all
  console.log(subError ? `   ❌ ${subError.message}` : '   ✅ Deleted');

  // 3. Delete assessment questions
  console.log('3. Deleting assessment questions...');
  const { error: taqError } = await supabase
    .from('teacher_assessment_questions')
    .delete()
    .not('id', 'is', null);
  console.log(taqError ? `   ❌ ${taqError.message}` : '   ✅ Deleted');

  const { error: qError } = await supabase
    .from('questions')
    .delete()
    .not('id', 'is', null);
  console.log(qError ? `   ❌ ${qError.message}` : '   ✅ Deleted');

  // 4. Delete assessments
  console.log('4. Deleting assessments...');
  const { error: assessError } = await supabase
    .from('assessments')
    .delete()
    .eq('school_id', schoolId);
  console.log(assessError ? `   ❌ ${assessError.message}` : '   ✅ Deleted');

  // 5. Delete live sessions
  console.log('5. Deleting live sessions...');
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('school_id', schoolId);

  const courseIds = courses?.map(c => c.id) || [];
  if (courseIds.length > 0) {
    const { error: lsError } = await supabase
      .from('live_sessions')
      .delete()
      .in('course_id', courseIds);
    console.log(lsError ? `   ❌ ${lsError.message}` : '   ✅ Deleted');
  }

  // 6. Delete students (but keep structure)
  console.log('6. Deleting students...');
  const { error: studentError } = await supabase
    .from('students')
    .delete()
    .eq('school_id', schoolId);
  console.log(studentError ? `   ❌ ${studentError.message}` : '   ✅ Deleted');

  // 7. Clean up teacher_profiles (keep admin's teacher profile)
  console.log('7. Cleaning teacher profiles...');
  // We'll keep teacher profiles but clear course assignments
  const { error: courseResetError } = await supabase
    .from('courses')
    .update({ teacher_id: null })
    .eq('section_id', sectionId);
  console.log(courseResetError ? `   ❌ ${courseResetError.message}` : '   ✅ Reset course teachers');

  // Reset section adviser
  const { error: sectionResetError } = await supabase
    .from('sections')
    .update({ adviser_teacher_id: null })
    .eq('id', sectionId);
  console.log(sectionResetError ? `   ❌ ${sectionResetError.message}` : '   ✅ Reset section adviser');

  console.log('\n✅ Cleanup complete!\n');

  // ========== PHASE 2: CREATE STUDENTS ==========
  console.log('=== PHASE 2: CREATE 10 STUDENT ACCOUNTS ===\n');

  const studentData = [
    { firstName: 'Maria', lastName: 'Santos', lrn: '2026-MSU-0001' },
    { firstName: 'Juan', lastName: 'Dela Cruz', lrn: '2026-MSU-0002' },
    { firstName: 'Ana', lastName: 'Reyes', lrn: '2026-MSU-0003' },
    { firstName: 'Carlos', lastName: 'Garcia', lrn: '2026-MSU-0004' },
    { firstName: 'Sofia', lastName: 'Martinez', lrn: '2026-MSU-0005' },
    { firstName: 'Miguel', lastName: 'Lopez', lrn: '2026-MSU-0006' },
    { firstName: 'Isabella', lastName: 'Fernandez', lrn: '2026-MSU-0007' },
    { firstName: 'Gabriel', lastName: 'Villanueva', lrn: '2026-MSU-0008' },
    { firstName: 'Elena', lastName: 'Mendoza', lrn: '2026-MSU-0009' },
    { firstName: 'Paolo', lastName: 'Cruz', lrn: '2026-MSU-0010' },
  ];

  const createdStudents: { id: string; name: string; email: string }[] = [];

  for (const student of studentData) {
    const fullName = `${student.firstName} ${student.lastName}`;
    const email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@msu.edu.ph`;
    const password = 'Student123!'; // Default password

    console.log(`Creating: ${fullName} (${email})`);

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student',
      },
    });

    if (authError) {
      // User might already exist, try to get them
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);

      if (existing) {
        console.log(`   ⚠️ Auth user exists, using existing: ${existing.id}`);

        // Continue with existing user
        await createStudentRecords(supabase, existing.id, fullName, email, student.lrn, schoolId, sectionId, createdStudents);
      } else {
        console.log(`   ❌ Auth error: ${authError.message}`);
      }
      continue;
    }

    if (authUser?.user) {
      await createStudentRecords(supabase, authUser.user.id, fullName, email, student.lrn, schoolId, sectionId, createdStudents);
    }
  }

  // ========== PHASE 3: ENROLL STUDENTS ==========
  console.log('\n=== PHASE 3: ENROLL STUDENTS IN COURSES ===\n');

  // Get all courses for the section
  const { data: sectionCourses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', sectionId);

  console.log('Courses in Grade 12 STEM A:', sectionCourses?.length || 0);

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

    const { error: enrollInsertError } = await supabase
      .from('enrollments')
      .insert(enrollments);

    if (enrollInsertError) {
      console.log('❌ Enrollment error:', enrollInsertError.message);
    } else {
      console.log(`✅ Created ${enrollments.length} enrollments`);
      console.log(`   (${createdStudents.length} students × ${sectionCourses.length} courses)`);
    }
  }

  // ========== SUMMARY ==========
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SETUP COMPLETE                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('School: Mindanao State University');
  console.log('Section: Grade 12 - STEM A');
  console.log('Courses: ' + (sectionCourses?.length || 0));
  console.log('Students Created: ' + createdStudents.length);
  console.log('');
  console.log('=== STUDENT ACCOUNTS ===\n');
  console.log('Default Password: Student123!\n');

  createdStudents.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   Email: ${s.email}`);
    console.log('');
  });

  console.log('=== NEXT STEPS ===\n');
  console.log('1. Create a Teacher account in the admin panel');
  console.log('2. Assign the teacher to Grade 12 STEM A courses');
  console.log('3. Create assessments and live sessions');
  console.log('4. Test with student accounts above');
}

async function createStudentRecords(
  supabase: any,
  authUserId: string,
  fullName: string,
  email: string,
  lrn: string,
  schoolId: string,
  sectionId: string,
  createdStudents: { id: string; name: string; email: string }[]
) {
  // 2. Create/update profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authUserId,
      email: email,
      full_name: fullName,
      role: 'student',
    })
    .select()
    .single();

  if (profileError) {
    console.log(`   ❌ Profile error: ${profileError.message}`);
    return;
  }

  // 3. Create school_profile
  const { data: schoolProfile, error: spError } = await supabase
    .from('school_profiles')
    .upsert({
      auth_user_id: authUserId,
      full_name: fullName,
      role: 'student',
    })
    .select()
    .single();

  if (spError) {
    console.log(`   ❌ School profile error: ${spError.message}`);
    return;
  }

  // 4. Create student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      profile_id: schoolProfile.id,
      school_id: schoolId,
      section_id: sectionId,
      lrn: lrn,
      grade_level: '12',
      status: 'active',
    })
    .select()
    .single();

  if (studentError) {
    console.log(`   ❌ Student error: ${studentError.message}`);
    return;
  }

  console.log(`   ✅ Created: ${fullName} (Student ID: ${student.id})`);
  createdStudents.push({ id: student.id, name: fullName, email: email });
}

freshSetup();
