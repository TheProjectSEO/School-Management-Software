/**
 * Check all table schemas used by the app
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tables = [
  'assessments',
  'notifications',
  'room_sessions',
  'live_sessions',
  'student_progress',
  'enrollments',
  'courses',
  'modules',
  'lessons',
  'submissions',
  'student_answers',
  'announcements',
  'teacher_direct_messages',
];

async function main() {
  console.log('='.repeat(60));
  console.log('SCHEMA CHECK');
  console.log('='.repeat(60));

  for (const table of tables) {
    console.log(`\n${table}:`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      // Try to get columns even if table is empty
      const { error: emptyError } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      if (emptyError) {
        console.log(`  ERROR: ${emptyError.message}`);
      } else {
        console.log(`  (empty table)`);
      }
    }
  }
}

main().catch(console.error);
