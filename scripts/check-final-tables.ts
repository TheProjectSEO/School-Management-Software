import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tables = [
  'teacher_announcements',
  'announcement_reads',
  'teacher_profiles',
];

async function main() {
  console.log('Checking final tables...');

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`${table}: ERROR - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`${table}: OK - Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`${table}: OK (empty)`);
    }
  }

  // Test the student dashboard data fetch for our test user
  const STUDENT_ID = 'cea4cbcf-37ee-4724-af5a-800db5ae82a6';

  console.log('\n--- Testing data fetch for student ---');

  // Get enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, course:courses(name)')
    .eq('student_id', STUDENT_ID);
  console.log('Enrollments:', enrollments?.length || 0);

  // Get recent progress
  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', STUDENT_ID)
    .limit(5);
  console.log('Progress records:', progress?.length || 0);

  // Get notifications
  const { data: notifs } = await supabase
    .from('student_notifications')
    .select('*')
    .eq('student_id', STUDENT_ID)
    .limit(5);
  console.log('Notifications:', notifs?.length || 0);

  // Get live sessions for enrolled courses
  if (enrollments && enrollments.length > 0) {
    const courseIds = enrollments.map((e: any) => e.course_id);
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select('*')
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'live'])
      .limit(5);
    console.log('Live sessions:', sessions?.length || 0);
  }
}

main().catch(console.error);
