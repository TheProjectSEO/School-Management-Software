import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== GETTING TABLE COLUMNS ===\n');

  // Try to get columns by selecting with * and limit 0
  // This tells us what columns the PostgREST knows about

  const tables = ['teacher_daily_attendance', 'teacher_attendance', 'enrollments'];

  for (const table of tables) {
    console.log(`\n${table}:`);

    // Use a raw query to get info
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0);

    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      // The response doesn't include columns when empty, but we can get them from a test insert error
      // Let's try selecting a known column
      const { error: testError } = await supabase
        .from(table)
        .select('id, student_id')
        .limit(1);

      if (testError) {
        console.log(`  Error getting columns: ${testError.message}`);
      } else {
        console.log(`  Table accessible`);
      }
    }
  }

  // Let's try a more direct approach - try inserting with each column
  console.log('\n=== Testing teacher_daily_attendance columns ===');

  const columnsToTest = [
    'id', 'student_id', 'date', 'status', 'school_id', 'section_id',
    'notes', 'updated_by', 'manual_override', 'detected_from_login',
    'first_seen_at', 'last_seen_at', 'created_at', 'updated_at'
  ];

  for (const col of columnsToTest) {
    const { error } = await supabase
      .from('teacher_daily_attendance')
      .select(col)
      .limit(1);

    if (error) {
      console.log(`  ${col}: ❌ Not found`);
    } else {
      console.log(`  ${col}: ✅ Exists`);
    }
  }
}

check();
