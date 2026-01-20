import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { db: { schema: 'public' } }
);

console.log('Checking tables in "public" schema...\n');

const tables = [
  'students',
  'profiles',
  'courses',
  'enrollments',
  'student_notifications',
  'notifications',
  'student_notes',
  'notes',
  'student_downloads',
  'downloads',
  'assessments',
  'submissions'
];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('id').limit(1);
  if (error) {
    console.log(`❌ ${table}: ${error.message.substring(0, 80)}`);
  } else {
    console.log(`✅ ${table}: exists`);
  }
}

console.log('\nNow checking enrollments for student...');
const { count } = await supabase
  .from('enrollments')
  .select('*', { count: 'exact', head: true })
  .eq('student_id', 'cc0c8b60-5736-4299-8015-e0a649119b8f');

console.log(`Student enrollments: ${count || 0}`);
