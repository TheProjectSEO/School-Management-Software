import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function diagnose() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== DIAGNOSING ASSESSMENT VISIBILITY ===\n');

  // 1. Get all assessments
  console.log('1. ALL ASSESSMENTS:');
  const { data: assessments, error: aErr } = await supabase
    .from('assessments')
    .select('id, title, course_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (aErr) {
    console.log('   Error:', aErr.message);
  } else {
    console.log('   Found:', assessments?.length || 0, 'assessments (showing latest 10)');
    for (const a of assessments || []) {
      const statusIcon = a.status === 'published' ? '✅' : '❌';
      console.log(`   ${statusIcon} ${a.title}`);
      console.log(`      Status: ${a.status}`);
      console.log(`      Course ID: ${a.course_id}`);
      console.log(`      Created: ${a.created_at}`);
    }
  }

  // 2. Get courses in Grade 12 - STEM A
  console.log('\n2. COURSES IN GRADE 12 - STEM A:');
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', grade12StemAId);

  const courseIds = courses?.map(c => c.id) || [];
  console.log('   Found:', courseIds.length, 'courses');

  // 3. Check if assessments are for these courses
  console.log('\n3. ASSESSMENTS FOR GRADE 12 - STEM A COURSES:');
  const { data: stemAssessments } = await supabase
    .from('assessments')
    .select('id, title, course_id, status')
    .in('course_id', courseIds);

  console.log('   Found:', stemAssessments?.length || 0, 'assessments');
  stemAssessments?.forEach(a => {
    const course = courses?.find(c => c.id === a.course_id);
    const statusIcon = a.status === 'published' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${a.title} (${course?.name || 'Unknown course'})`);
    console.log(`      Status: ${a.status}`);
  });

  // 4. Get student enrollments
  console.log('\n4. STUDENT ENROLLMENTS:');
  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id')
    .eq('section_id', grade12StemAId);

  console.log('   Students in Grade 12 - STEM A:', students?.length || 0);

  if (students && students.length > 0) {
    const studentIds = students.map(s => s.id);

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id')
      .in('student_id', studentIds);

    console.log('   Total enrollments:', enrollments?.length || 0);

    // Check if students are enrolled in courses that have assessments
    const enrolledCourseIds = [...new Set(enrollments?.map(e => e.course_id) || [])];
    console.log('   Unique courses enrolled:', enrolledCourseIds.length);

    // Compare with assessment courses
    const assessmentCourseIds = stemAssessments?.map(a => a.course_id) || [];
    const overlap = enrolledCourseIds.filter(id => assessmentCourseIds.includes(id));
    console.log('   Courses with both enrollment AND assessment:', overlap.length);

    if (overlap.length === 0 && assessmentCourseIds.length > 0) {
      console.log('\n   ❌ PROBLEM: Students are not enrolled in courses that have assessments!');
    }
  }

  // 5. Check the DAL query logic
  console.log('\n5. SIMULATING STUDENT ASSESSMENT QUERY:');

  // Pick first student
  const testStudent = students?.[0];
  if (testStudent) {
    // Get their enrollments
    const { data: studentEnrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', testStudent.id);

    const enrolledCourses = studentEnrollments?.map(e => e.course_id) || [];
    console.log('   Student enrolled in', enrolledCourses.length, 'courses');

    if (enrolledCourses.length > 0) {
      // Get assessments for those courses
      const { data: visibleAssessments } = await supabase
        .from('assessments')
        .select('id, title, status')
        .in('course_id', enrolledCourses)
        .eq('status', 'published');

      console.log('   Published assessments visible:', visibleAssessments?.length || 0);
      visibleAssessments?.forEach(a => {
        console.log(`     - ${a.title}`);
      });

      if (visibleAssessments?.length === 0) {
        // Check without status filter
        const { data: allAssessments } = await supabase
          .from('assessments')
          .select('id, title, status')
          .in('course_id', enrolledCourses);

        console.log('\n   All assessments (including drafts):', allAssessments?.length || 0);
        allAssessments?.forEach(a => {
          console.log(`     - ${a.title} (${a.status})`);
        });

        if (allAssessments && allAssessments.length > 0) {
          console.log('\n   ⚠️ Assessments exist but are NOT published!');
        }
      }
    } else {
      console.log('   ❌ Student has no enrollments!');
    }
  }
}

diagnose();
