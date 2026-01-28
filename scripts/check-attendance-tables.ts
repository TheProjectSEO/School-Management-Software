import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING ATTENDANCE TABLES ===\n');

  // Check teacher_daily_attendance
  console.log('1. teacher_daily_attendance:');
  const { data: daily, error: dailyError } = await supabase
    .from('teacher_daily_attendance')
    .select('*')
    .limit(1);

  if (dailyError) {
    console.log('   Error:', dailyError.message);
  } else if (daily && daily.length > 0) {
    console.log('   Columns:', Object.keys(daily[0]).join(', '));
    console.log('   Sample:', JSON.stringify(daily[0], null, 2).substring(0, 300));
  } else {
    console.log('   Table exists but is empty');
  }

  // Check teacher_attendance
  console.log('\n2. teacher_attendance:');
  const { data: attendance, error: attendanceError } = await supabase
    .from('teacher_attendance')
    .select('*')
    .limit(1);

  if (attendanceError) {
    console.log('   Error:', attendanceError.message);
  } else if (attendance && attendance.length > 0) {
    console.log('   Columns:', Object.keys(attendance[0]).join(', '));
    console.log('   Sample:', JSON.stringify(attendance[0], null, 2).substring(0, 300));
  } else {
    console.log('   Table exists but is empty');
  }

  // Count records in each
  console.log('\n3. Record counts:');
  const { count: dailyCount } = await supabase
    .from('teacher_daily_attendance')
    .select('*', { count: 'exact', head: true });
  console.log('   teacher_daily_attendance:', dailyCount || 0, 'records');

  const { count: attendanceCount } = await supabase
    .from('teacher_attendance')
    .select('*', { count: 'exact', head: true });
  console.log('   teacher_attendance:', attendanceCount || 0, 'records');
}

check();
