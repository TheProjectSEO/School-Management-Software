import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tables = [
  'student_notifications',
  'student_notes',
  'student_downloads',
  'student_announcements',
  'announcement_targets',
  'school_announcements',
];

async function main() {
  console.log('Checking additional tables...');

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
}

main();
