import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  db: { schema: 'school software' },
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('\n🔍 Checking courses table structure...\n');

// Try to get one course to see the structure
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Error:', error.message);
} else if (data && data.length > 0) {
  console.log('✅ Sample course record:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('\n📋 Available columns:');
  Object.keys(data[0]).forEach(col => console.log(`   - ${col}`));
} else {
  console.log('⚠️  No courses found. Let me check table exists...');

  // Try a simple insert to see what columns are expected
  const { error: insertError } = await supabase
    .from('courses')
    .insert({
      school_id: '11111111-1111-1111-1111-111111111111',
      name: 'Test Course'
    })
    .select();

  if (insertError) {
    console.log('Error details:', insertError);
  } else {
    console.log('✅ Insert worked! Checking again...');
  }
}

console.log('\n');
