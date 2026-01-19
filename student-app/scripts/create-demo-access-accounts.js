/**
 * Create Demo Access Accounts
 * Creates admin, teacher, and student accounts with KNOWN passwords for testing
 *
 * Run: node scripts/create-demo-access-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const MSU_SCHOOL_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_PASSWORD = 'Demo123!@#';

async function createDemoAccounts() {
  console.log('🎓 Creating Demo Access Accounts for MSU Platform');
  console.log('================================================\n');

  const results = {
    admin: null,
    teacher: null,
    student: null
  };

  // =================================================================
  // 1. CREATE DEMO ADMIN
  // =================================================================
  console.log('1️⃣  Creating Admin Account...');

  try {
    // Create auth user
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Administrator'
      }
    });

    if (adminAuthError && !adminAuthError.message.includes('already registered')) {
      throw adminAuthError;
    }

    const adminAuthId = adminAuth?.user?.id || (
      await supabase.auth.admin.listUsers()
    ).data?.users.find(u => u.email === 'admin.demo@msu.edu.ph')?.id;

    if (!adminAuthId) throw new Error('Could not create/find admin auth user');

    // Create school profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('school_profiles')
      .upsert({
        auth_user_id: adminAuthId,
        full_name: 'Demo Administrator',
        phone: '+639999999999'
      }, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (profileError) throw profileError;

    // Add to school_members as admin
    const { error: memberError } = await supabase
      .from('school_members')
      .upsert({
        school_id: MSU_SCHOOL_ID,
        profile_id: adminProfile.id,
        role: 'school_admin',
        status: 'active'
      }, { onConflict: 'school_id,profile_id' });

    if (memberError) throw memberError;

    results.admin = {
      email: 'admin.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      name: 'Demo Administrator'
    };

    console.log('   ✅ Admin account created');
    console.log(`   📧 Email: admin.demo@msu.edu.ph`);
    console.log(`   🔑 Password: ${DEMO_PASSWORD}`);
    console.log(`   🌐 URL: http://localhost:3001/login\n`);

  } catch (error) {
    console.error('   ❌ Admin creation failed:', error.message);
  }

  // =================================================================
  // 2. CREATE DEMO TEACHER
  // =================================================================
  console.log('2️⃣  Creating Teacher Account...');

  try {
    // Create auth user
    const { data: teacherAuth, error: teacherAuthError } = await supabase.auth.admin.createUser({
      email: 'teacher.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Teacher'
      }
    });

    if (teacherAuthError && !teacherAuthError.message.includes('already registered')) {
      throw teacherAuthError;
    }

    const teacherAuthId = teacherAuth?.user?.id || (
      await supabase.auth.admin.listUsers()
    ).data?.users.find(u => u.email === 'teacher.demo@msu.edu.ph')?.id;

    if (!teacherAuthId) throw new Error('Could not create/find teacher auth user');

    // Create school profile
    const { data: teacherProfile, error: profileError } = await supabase
      .from('school_profiles')
      .upsert({
        auth_user_id: teacherAuthId,
        full_name: 'Demo Teacher',
        phone: '+639888888888'
      }, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (profileError) throw profileError;

    // Create teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .upsert({
        profile_id: teacherProfile.id,
        school_id: MSU_SCHOOL_ID,
        employee_id: 'EMP-DEMO-2026',
        department: 'Demo Department',
        specialization: 'All Subjects',
        is_active: true
      }, { onConflict: 'profile_id' })
      .select()
      .single();

    if (teacherError) throw teacherError;

    // Assign to first available MSU course
    const { data: course } = await supabase
      .from('courses')
      .select('id, name, subject_code')
      .eq('school_id', MSU_SCHOOL_ID)
      .is('teacher_id', null)
      .limit(1)
      .single();

    if (course) {
      await supabase
        .from('courses')
        .update({ teacher_id: teacher.id })
        .eq('id', course.id);

      console.log(`   ✅ Teacher account created and assigned to: ${course.name}`);
    } else {
      console.log('   ✅ Teacher account created (no courses assigned)');
    }

    results.teacher = {
      email: 'teacher.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      name: 'Demo Teacher'
    };

    console.log(`   📧 Email: teacher.demo@msu.edu.ph`);
    console.log(`   🔑 Password: ${DEMO_PASSWORD}`);
    console.log(`   🌐 URL: http://localhost:3002/login\n`);

  } catch (error) {
    console.error('   ❌ Teacher creation failed:', error.message);
  }

  // =================================================================
  // 3. CREATE DEMO STUDENT
  // =================================================================
  console.log('3️⃣  Creating Student Account...');

  try {
    // Create auth user
    const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: 'student.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Student'
      }
    });

    if (studentAuthError && !studentAuthError.message.includes('already registered')) {
      throw studentAuthError;
    }

    const studentAuthId = studentAuth?.user?.id || (
      await supabase.auth.admin.listUsers()
    ).data?.users.find(u => u.email === 'student.demo@msu.edu.ph')?.id;

    if (!studentAuthId) throw new Error('Could not create/find student auth user');

    // Create school profile
    const { data: studentProfile, error: profileError } = await supabase
      .from('school_profiles')
      .upsert({
        auth_user_id: studentAuthId,
        full_name: 'Demo Student',
        phone: '+639777777777'
      }, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (profileError) throw profileError;

    // Get Grade 10-A section
    const { data: section } = await supabase
      .from('sections')
      .select('id')
      .eq('school_id', MSU_SCHOOL_ID)
      .eq('name', 'Grade 10-A')
      .single();

    if (!section) throw new Error('Grade 10-A section not found');

    // Create student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .upsert({
        profile_id: studentProfile.id,
        school_id: MSU_SCHOOL_ID,
        lrn: '2026-DEMO-STUDENT',
        grade_level: '10',
        section_id: section.id
      }, { onConflict: 'lrn' })
      .select()
      .single();

    if (studentError) throw studentError;

    // Enroll in all Grade 10-A courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('section_id', section.id);

    if (courses && courses.length > 0) {
      const enrollments = courses.map(c => ({
        student_id: student.id,
        course_id: c.id,
        school_id: MSU_SCHOOL_ID
      }));

      await supabase
        .from('enrollments')
        .upsert(enrollments, { onConflict: 'student_id,course_id' });

      console.log(`   ✅ Student account created and enrolled in ${courses.length} courses`);
    } else {
      console.log('   ✅ Student account created (no courses to enroll)');
    }

    results.student = {
      email: 'student.demo@msu.edu.ph',
      password: DEMO_PASSWORD,
      name: 'Demo Student',
      enrollments: courses?.length || 0
    };

    console.log(`   📧 Email: student.demo@msu.edu.ph`);
    console.log(`   🔑 Password: ${DEMO_PASSWORD}`);
    console.log(`   🌐 URL: http://localhost:3000/login\n`);

  } catch (error) {
    console.error('   ❌ Student creation failed:', error.message);
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('================================================');
  console.log('✅ DEMO ACCOUNTS CREATED\n');

  console.log('🔐 LOGIN CREDENTIALS (Password for all: Demo123!@#)\n');

  console.log('👔 ADMIN ACCESS:');
  if (results.admin) {
    console.log(`   Email: ${results.admin.email}`);
    console.log(`   Password: ${results.admin.password}`);
    console.log(`   URL: http://localhost:3001/login`);
    console.log(`   Features: Review applications, Create QR codes, Manage enrollments\n`);
  } else {
    console.log('   ❌ Admin account creation failed - create manually\n');
  }

  console.log('👨‍🏫 TEACHER ACCESS:');
  if (results.teacher) {
    console.log(`   Email: ${results.teacher.email}`);
    console.log(`   Password: ${results.teacher.password}`);
    console.log(`   URL: http://localhost:3002/login`);
    console.log(`   Features: Create modules/lessons, Manage content, Grade students\n`);
  } else {
    console.log('   ❌ Teacher account creation failed - create manually\n');
  }

  console.log('👨‍🎓 STUDENT ACCESS:');
  if (results.student) {
    console.log(`   Email: ${results.student.email}`);
    console.log(`   Password: ${results.student.password}`);
    console.log(`   URL: http://localhost:3000/login`);
    console.log(`   Features: Study lessons, Join live classes, React to content`);
    console.log(`   Enrolled in: ${results.student.enrollments} courses\n`);
  } else {
    console.log('   ❌ Student account creation failed - create manually\n');
  }

  console.log('================================================');
  console.log('🎉 Setup Complete! You can now login and test.\n');
}

createDemoAccounts().catch(console.error);
