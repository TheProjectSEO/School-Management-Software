#!/usr/bin/env node

/**
 * Proper Seed Script Using Supabase Auth API
 * This creates REAL student accounts (not placeholder auth_user_ids)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required in .env.local');
  console.error('Get it from: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'school software' }
});

const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
const DEFAULT_PASSWORD = 'Student123!@#';

async function seed() {
  console.log('🌱 Seeding with Supabase Auth API...\n');

  // Get teacher profile
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, profiles(full_name)')
    .eq('school_id', SCHOOL_ID)
    .single();

  if (!teacher) {
    console.error('❌ Teacher not found. Register teacher first.');
    process.exit(1);
  }

  console.log(`✅ Teacher: ${teacher.profiles.full_name}\n`);

  // Step 1: Create sections
  console.log('Creating sections...');
  const { data: sections } = await supabase
    .from('sections')
    .insert([
      { school_id: SCHOOL_ID, name: 'Grade 10 - Einstein', grade_level: '10' },
      { school_id: SCHOOL_ID, name: 'Grade 11 - Newton', grade_level: '11' },
      { school_id: SCHOOL_ID, name: 'Grade 12 - Curie', grade_level: '12' }
    ])
    .select();

  console.log(`✅ Created ${sections?.length || 0} sections\n`);

  // Step 2: Create courses
  console.log('Creating courses...');
  const coursesToCreate = sections.flatMap(section => [
    {
      school_id: SCHOOL_ID,
      section_id: section.id,
      name: `Mathematics ${section.grade_level}01`,
      subject_code: `MATH${section.grade_level}01`,
      teacher_id: teacher.id
    }
  ]);

  const { data: courses } = await supabase
    .from('courses')
    .insert(coursesToCreate)
    .select();

  console.log(`✅ Created ${courses?.length || 0} courses\n`);

  // Step 3: Create teacher assignments
  console.log('Creating teacher assignments...');
  const assignments = courses.map(course => ({
    teacher_profile_id: teacher.id,
    section_id: course.section_id,
    course_id: course.id,
    is_primary: true
  }));

  await supabase.from('teacher_assignments').insert(assignments);
  console.log(`✅ Created ${assignments.length} teacher assignments\n`);

  // Step 4: Create REAL student accounts
  console.log('Creating student accounts with Supabase Auth...');
  const students = [
    { name: 'Maria Santos', email: 'maria.santos@student.msu.edu.ph', section: 'Grade 10 - Einstein', lrn: '123456789001' },
    { name: 'Juan Reyes', email: 'juan.reyes@student.msu.edu.ph', section: 'Grade 10 - Einstein', lrn: '123456789002' },
    { name: 'Rosa Garcia', email: 'rosa.garcia@student.msu.edu.ph', section: 'Grade 11 - Newton', lrn: '123456789003' },
    { name: 'Miguel Lopez', email: 'miguel.lopez@student.msu.edu.ph', section: 'Grade 11 - Newton', lrn: '123456789004' },
    { name: 'Anna Martinez', email: 'anna.martinez@student.msu.edu.ph', section: 'Grade 12 - Curie', lrn: '123456789005' },
    { name: 'Carlos Fernandez', email: 'carlos.fernandez@student.msu.edu.ph', section: 'Grade 12 - Curie', lrn: '123456789006' }
  ];

  for (const student of students) {
    console.log(`  Creating: ${student.name}...`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: student.name }
    });

    if (authError && !authError.message.includes('already')) {
      console.log(`    ⚠️  Auth error: ${authError.message}`);
      continue;
    }

    const authUserId = authData?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === student.email)?.id;

    // Create profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ auth_user_id: authUserId, full_name: student.name, phone: `+63-917-${student.lrn.slice(-7)}` })
      .select()
      .single();

    // Create student record
    const section = sections.find(s => s.name === student.section);
    await supabase.from('students').upsert({
      school_id: SCHOOL_ID,
      profile_id: profile.id,
      lrn: student.lrn,
      grade_level: section.grade_level,
      section_id: section.id
    });

    console.log(`    ✅ ${student.name} created`);
  }

  // Step 5: Enroll students
  console.log('\nEnrolling students in courses...');
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, section_id')
    .eq('school_id', SCHOOL_ID);

  const enrollments = [];
  for (const student of allStudents) {
    const studentCourses = courses.filter(c => c.section_id === student.section_id);
    enrollments.push(...studentCourses.map(c => ({
      school_id: SCHOOL_ID,
      student_id: student.id,
      course_id: c.id
    })));
  }

  await supabase.from('enrollments').upsert(enrollments);
  console.log(`✅ Created ${enrollments.length} enrollments\n`);

  // Step 6: Create modules
  console.log('Creating modules...');
  const modules = courses.flatMap((course, i) => [
    { course_id: course.id, title: 'Introduction', order: 1, duration_minutes: 60, is_published: true },
    { course_id: course.id, title: 'Advanced Topics', order: 2, duration_minutes: 90, is_published: true }
  ]);

  const { data: createdModules } = await supabase.from('modules').insert(modules).select();
  console.log(`✅ Created ${createdModules?.length || 0} modules\n`);

  console.log('🎉 Seed complete!\n');
  console.log('📊 Summary:');
  console.log(`  Sections: ${sections.length}`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Students: ${students.length}`);
  console.log(`  Enrollments: ${enrollments.length}`);
  console.log(`  Modules: ${createdModules?.length || 0}`);
  console.log('\n🧪 Test:');
  console.log('  Teacher app → Messages → New Message');
  console.log(`  Should show ${students.length} students!\n`);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
