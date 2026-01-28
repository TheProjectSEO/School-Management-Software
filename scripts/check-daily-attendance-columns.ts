import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING TEACHER_DAILY_ATTENDANCE TABLE ===\n');

  // Try to insert a test record to see what columns exist
  const testData = {
    student_id: '00000000-0000-0000-0000-000000000001',
    date: '2026-01-01',
    status: 'present',
    manual_override: true,
    detected_from_login: false,
    notes: 'test',
    updated_by: '00000000-0000-0000-0000-000000000001'
  };

  console.log('Attempting insert with all columns...');
  const { error } = await supabase
    .from('teacher_daily_attendance')
    .insert(testData);

  if (error) {
    console.log('Error:', error.message);

    // Check which column is missing
    if (error.message.includes('notes')) {
      console.log('\n⚠️ Column "notes" is missing!');
    }
    if (error.message.includes('updated_by')) {
      console.log('⚠️ Column "updated_by" is missing!');
    }
    if (error.message.includes('column')) {
      console.log('\nThe table may be missing some columns.');
      console.log('Required columns: student_id, date, status, manual_override, detected_from_login, notes, updated_by');
    }
  } else {
    console.log('✅ All columns exist! Cleaning up test data...');
    await supabase
      .from('teacher_daily_attendance')
      .delete()
      .eq('date', '2026-01-01')
      .eq('student_id', '00000000-0000-0000-0000-000000000001');
  }

  // Try a minimal insert
  console.log('\nAttempting minimal insert...');
  const minimalData = {
    student_id: '00000000-0000-0000-0000-000000000001',
    date: '2026-01-02',
    status: 'present'
  };

  const { error: minError } = await supabase
    .from('teacher_daily_attendance')
    .insert(minimalData);

  if (minError) {
    console.log('Minimal insert error:', minError.message);
  } else {
    console.log('✅ Minimal insert succeeded');
    await supabase
      .from('teacher_daily_attendance')
      .delete()
      .eq('date', '2026-01-02')
      .eq('student_id', '00000000-0000-0000-0000-000000000001');
  }
}

check();
