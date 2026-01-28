import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

console.log('📊 Checking available tables...\n');

const tables = [
  'profiles',
  'admin_profiles',
  'school_members',
  'schools',
  'students',
  'teachers',
  'teacher_profiles',
  'users'
];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(1);

  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: Exists (${data?.length || 0} sample rows)`);
  }
}

console.log('\n🔍 Checking if there are ANY records in key tables...\n');

// Check schools
const { data: schools } = await supabase.from('schools').select('id, name').limit(5);
if (schools && schools.length > 0) {
  console.log(`Schools found: ${schools.length}`);
  schools.forEach(s => console.log(`  - ${s.name} (${s.id})`));
}
