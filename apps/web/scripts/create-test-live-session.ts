import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function createTestLiveSession() {
  const supabase = createAdminClient();
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const schoolId = '11111111-1111-1111-1111-111111111111';

  console.log('=== CREATING TEST LIVE SESSION ===\n');

  // 1. Get a course from Grade 12 STEM A
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', sectionId)
    .not('teacher_id', 'is', null)
    .limit(1);

  if (!courses?.length) {
    // Try without teacher_id filter
    const { data: anyCourse } = await supabase
      .from('courses')
      .select('id, name, teacher_id')
      .eq('section_id', sectionId)
      .limit(1);

    if (!anyCourse?.length) {
      console.log('❌ No courses found for section');
      return;
    }
    courses.push(anyCourse[0]);
  }

  const course = courses[0];
  console.log('Using course:', course.name);
  console.log('Course ID:', course.id);

  // 2. Get a teacher profile
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .limit(1)
    .single();

  if (!teacher) {
    console.log('❌ No teacher found');
    return;
  }

  console.log('Teacher profile ID:', teacher.id);

  // 3. Create a scheduled live session
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 1); // Start in 1 hour

  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1); // 1 hour duration

  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .insert({
      course_id: course.id,
      teacher_profile_id: teacher.id,
      title: 'Test Live Session - Introduction to Statistics',
      description: 'This is a test live session to verify student visibility.',
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      status: 'scheduled',
      recording_enabled: true,
      max_participants: 50,
    })
    .select()
    .single();

  if (sessionError) {
    console.log('❌ Error creating live session:', sessionError.message);
    console.log('Full error:', sessionError);
    return;
  }

  console.log('\n✅ Live Session created!');
  console.log('   ID:', session.id);
  console.log('   Title:', session.title);
  console.log('   Status:', session.status);
  console.log('   Starts:', new Date(session.scheduled_start).toLocaleString());

  // 4. Verify student can see it
  console.log('\n=== VERIFICATION ===\n');

  // Get a student from the section
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .limit(1);

  if (!students?.length) {
    console.log('❌ No students found');
    return;
  }

  const studentId = students[0].id;

  // Get their enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId);

  const courseIds = enrollments?.map(e => e.course_id) || [];

  // Query live sessions like the student page does
  const { data: visibleSessions } = await supabase
    .from('live_sessions')
    .select('id, title, status, scheduled_start, course_id')
    .in('course_id', courseIds)
    .order('scheduled_start', { ascending: true });

  console.log('Student can see', visibleSessions?.length || 0, 'live sessions:');
  visibleSessions?.forEach(s => {
    console.log(`  ✅ ${s.title} (${s.status}) - ${new Date(s.scheduled_start).toLocaleString()}`);
  });

  console.log('\n=== TEST COMPLETE ===\n');
}

createTestLiveSession();
