/**
 * Diagnose student data fetching issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// mrdariusmaster@gmail.com auth user ID
const AUTH_USER_ID = 'b5733666-7690-4b0a-a693-930d34bbeb58';
const SCHOOL_PROFILE_ID = '370843c8-c593-42c0-8676-410b999e7769';

async function main() {
  console.log('='.repeat(60));
  console.log('STUDENT DATA DIAGNOSIS');
  console.log('='.repeat(60));
  console.log('');

  // 1. Check if RPC function exists
  console.log('1. Checking RPC function get_current_student_full...');
  const { data: rpcResult, error: rpcError } = await supabase.rpc('get_current_student_full', {
    p_auth_user_id: AUTH_USER_ID,
  });

  if (rpcError) {
    console.log('   ERROR:', rpcError.message);
    console.log('   The RPC function may not exist or has wrong parameters');
  } else {
    console.log('   RPC Result:', JSON.stringify(rpcResult, null, 2));
  }
  console.log('');

  // 2. Get student record directly
  console.log('2. Checking students table...');
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', SCHOOL_PROFILE_ID)
    .single();

  if (studentError) {
    console.log('   ERROR:', studentError.message);
  } else {
    console.log('   Student record:', JSON.stringify(student, null, 2));
  }
  console.log('');

  const studentId = student?.id;

  if (!studentId) {
    console.log('   No student ID found, cannot check enrollments');
    return;
  }

  // 3. Check enrollments
  console.log('3. Checking enrollments for student ID:', studentId);
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('*, course:courses(id, name, subject_code)')
    .eq('student_id', studentId);

  if (enrollError) {
    console.log('   ERROR:', enrollError.message);
  } else {
    console.log('   Enrollments count:', enrollments?.length || 0);
    enrollments?.forEach((e: any) => {
      console.log(`     - ${e.course?.name || 'Unknown'} (${e.course?.subject_code || 'N/A'})`);
    });
  }
  console.log('');

  // 4. Check student_progress
  console.log('4. Checking student_progress...');
  const { data: progress, error: progressError } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId);

  if (progressError) {
    console.log('   ERROR:', progressError.message);
  } else {
    console.log('   Progress records:', progress?.length || 0);
  }
  console.log('');

  // 5. Check assessments
  console.log('5. Checking assessments (via enrollments)...');
  if (enrollments && enrollments.length > 0) {
    const courseIds = enrollments.map((e: any) => e.course_id);
    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select('id, title, type, due_date, course_id')
      .in('course_id', courseIds)
      .eq('is_published', true);

    if (assessError) {
      console.log('   ERROR:', assessError.message);
    } else {
      console.log('   Assessments count:', assessments?.length || 0);
      assessments?.forEach((a: any) => {
        console.log(`     - ${a.title} (${a.type}) - Due: ${a.due_date || 'No date'}`);
      });
    }
  } else {
    console.log('   No enrollments, skipping assessments check');
  }
  console.log('');

  // 6. Check notifications
  console.log('6. Checking notifications...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', studentId)
    .limit(5);

  if (notifError) {
    console.log('   ERROR:', notifError.message);
  } else {
    console.log('   Notifications count:', notifications?.length || 0);
  }
  console.log('');

  // 7. Check room_sessions (live sessions)
  console.log('7. Checking room_sessions...');
  if (enrollments && enrollments.length > 0) {
    const courseIds = enrollments.map((e: any) => e.course_id);
    const { data: sessions, error: sessionsError } = await supabase
      .from('room_sessions')
      .select('id, title, status, scheduled_start, course_id')
      .in('course_id', courseIds);

    if (sessionsError) {
      console.log('   ERROR:', sessionsError.message);
    } else {
      console.log('   Room sessions count:', sessions?.length || 0);
    }
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Student ID:', studentId);
  console.log('Enrollments:', enrollments?.length || 0);
  console.log('');

  if (!enrollments || enrollments.length === 0) {
    console.log('>>> PROBLEM: Student has NO enrollments!');
    console.log('>>> The student needs to be enrolled in courses to see data.');
    console.log('');
    console.log('To fix: Enroll the student in courses via admin panel or SQL');
  }
}

main().catch(console.error);
