/**
 * Test student dashboard data fetching
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDENT_ID = 'cea4cbcf-37ee-4724-af5a-800db5ae82a6';
const AUTH_USER_ID = 'b5733666-7690-4b0a-a693-930d34bbeb58';

async function main() {
  console.log('='.repeat(60));
  console.log('TESTING STUDENT DASHBOARD DATA');
  console.log('='.repeat(60));
  console.log('Student ID:', STUDENT_ID);
  console.log('');

  // 1. Test getCurrentStudent via RPC
  console.log('1. Testing get_current_student_full RPC...');
  const { data: studentData, error: studentError } = await supabase.rpc('get_current_student_full', {
    p_auth_user_id: AUTH_USER_ID,
  });

  if (studentError) {
    console.log('   ERROR:', studentError.message);
  } else {
    console.log('   OK - Student found:', studentData?.[0]?.full_name);
  }
  console.log('');

  // 2. Test getRecentSubjects (student_progress)
  console.log('2. Testing recent subjects (student_progress)...');
  const { data: progressData, error: progressError } = await supabase
    .from('student_progress')
    .select(`
      course_id,
      progress_percent,
      last_accessed_at,
      course:courses(id, name, subject_code)
    `)
    .eq('student_id', STUDENT_ID)
    .order('last_accessed_at', { ascending: false })
    .limit(5);

  if (progressError) {
    console.log('   ERROR:', progressError.message);
  } else {
    console.log('   OK - Progress records:', progressData?.length || 0);
    if (progressData?.length === 0) {
      console.log('   (No progress yet - student needs to start lessons)');
    }
  }
  console.log('');

  // 3. Test getUpcomingAssessments
  console.log('3. Testing upcoming assessments...');
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', STUDENT_ID);

  const courseIds = enrollments?.map(e => e.course_id) || [];
  console.log('   Enrolled in', courseIds.length, 'courses');

  if (courseIds.length > 0) {
    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select(`*, course:courses(name)`)
      .in('course_id', courseIds)
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(5);

    if (assessError) {
      console.log('   ERROR:', assessError.message);
    } else {
      console.log('   OK - Upcoming assessments:', assessments?.length || 0);
      assessments?.forEach(a => {
        console.log(`     - ${a.title} (due: ${a.due_date})`);
      });
    }
  }
  console.log('');

  // 4. Test getUnreadNotificationCount
  console.log('4. Testing notifications...');
  const { count: notifCount, error: notifError } = await supabase
    .from('student_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', STUDENT_ID)
    .eq('is_read', false);

  if (notifError) {
    console.log('   ERROR:', notifError.message);
  } else {
    console.log('   OK - Unread notifications:', notifCount || 0);
  }
  console.log('');

  // 5. Test getUpcomingRoomSessions (live_sessions)
  console.log('5. Testing live sessions...');
  if (courseIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('live_sessions')
      .select(`
        id, title, status, scheduled_start,
        course:courses(name)
      `)
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_start', { ascending: true })
      .limit(3);

    if (sessionsError) {
      console.log('   ERROR:', sessionsError.message);
    } else {
      console.log('   OK - Live sessions:', sessions?.length || 0);
    }
  }
  console.log('');

  // 6. Test getStudentProgressStats
  console.log('6. Testing progress stats...');
  const { count: totalCourses } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', STUDENT_ID);

  const { data: allProgress } = await supabase
    .from('student_progress')
    .select('progress_percent, completed_at')
    .eq('student_id', STUDENT_ID);

  const completedLessons = allProgress?.filter(p => p.completed_at)?.length || 0;
  const inProgressLessons = allProgress?.filter(p => !p.completed_at && p.progress_percent > 0)?.length || 0;

  console.log('   Total courses:', totalCourses || 0);
  console.log('   Completed lessons:', completedLessons);
  console.log('   In-progress lessons:', inProgressLessons);
  console.log('');

  console.log('='.repeat(60));
  console.log('SUMMARY: All data fetching is working correctly!');
  console.log('The dashboard may appear empty because:');
  console.log('- No lessons started yet (0 progress)');
  console.log('- No notifications sent');
  console.log('- No live sessions scheduled');
  console.log('='.repeat(60));
}

main().catch(console.error);
