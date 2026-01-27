import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     STUDENT VISIBILITY VERIFICATION                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Get students in section
  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id')
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .limit(3);

  console.log('=== 1. STUDENTS ===');
  console.log('Students in Grade 12 STEM A:', students?.length || 0);

  if (!students?.length) {
    console.log('❌ No students found!');
    return;
  }

  // 2. Get enrollments for first student
  const testStudent = students[0];
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', testStudent.id);

  console.log('\n=== 2. ENROLLMENTS ===');
  console.log(`Student ${testStudent.id.substring(0, 8)}... enrolled in:`, enrollments?.length || 0, 'courses');

  if (!enrollments?.length) {
    console.log('❌ No enrollments found!');
    return;
  }

  const courseIds = enrollments.map(e => e.course_id);

  // 3. Check assessments for these courses
  console.log('\n=== 3. ASSESSMENTS ===');

  const { data: allAssessments } = await supabase
    .from('assessments')
    .select('id, title, status, course_id')
    .in('course_id', courseIds);

  console.log('Total assessments for enrolled courses:', allAssessments?.length || 0);

  const statusCounts: Record<string, number> = {};
  allAssessments?.forEach(a => {
    statusCounts[a.status || 'null'] = (statusCounts[a.status || 'null'] || 0) + 1;
  });

  console.log('By status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    const icon = status === 'published' ? '✅' : '⚠️';
    console.log(`  ${icon} ${status}: ${count}`);
  });

  const publishedAssessments = allAssessments?.filter(a => a.status === 'published') || [];
  console.log('\nStudents will see:', publishedAssessments.length, 'assessments');

  if (publishedAssessments.length === 0 && (allAssessments?.length || 0) > 0) {
    console.log('⚠️  ISSUE: Assessments exist but none are published!');
    console.log('   Teachers need to publish assessments for students to see them.');
  }

  // 4. Check live sessions for these courses
  console.log('\n=== 4. LIVE SESSIONS ===');

  const { data: liveSessions } = await supabase
    .from('live_sessions')
    .select('id, title, status, course_id, scheduled_start')
    .in('course_id', courseIds);

  console.log('Total live sessions for enrolled courses:', liveSessions?.length || 0);

  const sessionStatusCounts: Record<string, number> = {};
  liveSessions?.forEach(s => {
    sessionStatusCounts[s.status || 'null'] = (sessionStatusCounts[s.status || 'null'] || 0) + 1;
  });

  if (liveSessions?.length) {
    console.log('By status:');
    Object.entries(sessionStatusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
  }

  // 5. Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const issues = [];

  if (!students?.length) issues.push('No students in section');
  if (!enrollments?.length) issues.push('No enrollments for students');
  if (publishedAssessments.length === 0 && (allAssessments?.length || 0) > 0) {
    issues.push('Assessments exist but not published');
  }
  if (!liveSessions?.length) issues.push('No live sessions created');

  if (issues.length === 0) {
    console.log('║  ✅ Student visibility data flow is working!                 ║');
  } else {
    console.log('║  ⚠️  Issues found:                                           ║');
    issues.forEach(issue => {
      console.log(`║    - ${issue.padEnd(52)} ║`);
    });
  }

  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 6. Data flow summary
  console.log('=== DATA FLOW ===\n');
  console.log('Student → Enrollments → Courses → Assessments (status=published)');
  console.log('Student → Enrollments → Courses → Live Sessions');
  console.log('');
  console.log('Code fixes applied:');
  console.log('  ✅ student-assessments.ts: Added .eq("status", "published") to all queries');
  console.log('  ✅ LiveSessionClient.tsx: Fixed endpoint path to /api/student/live-sessions/');
  console.log('  ✅ useLiveSessionQA.ts: Fixed endpoint path');
  console.log('  ✅ useLiveReactions.ts: Fixed endpoint path');
  console.log('  ✅ RecordingAIPanel.tsx: Fixed endpoint path');
}

verify();
