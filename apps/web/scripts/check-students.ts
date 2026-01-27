import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const PROFILE_ID = '370843c8-c593-42c0-8676-410b999e7769';

  // Check all students with this profile_id
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', PROFILE_ID);

  console.log('Students with profile_id', PROFILE_ID);
  console.log('Error:', error?.message || 'none');
  console.log('Count:', data?.length || 0);

  if (data && data.length > 0) {
    data.forEach(s => {
      console.log('---');
      console.log('  ID:', s.id);
      console.log('  Status:', s.status);
      console.log('  Enrollment:', s.enrollment_status);
    });
  }

  // Try single() query like getUserRole does
  console.log('\n--- Single query test ---');
  const { data: single, error: singleErr } = await supabase
    .from('students')
    .select('id, school_id')
    .eq('profile_id', PROFILE_ID)
    .single();

  console.log('Result:', single);
  console.log('Error:', singleErr?.message || 'none');

  // If multiple records, that's the problem - single() fails
  if (data && data.length > 1) {
    console.log('\n>>> PROBLEM: Multiple student records exist!');
    console.log('>>> The .single() call fails when there are multiple rows.');
    console.log('>>> Deleting duplicates...');

    // Keep only the first one
    const keepId = data[0].id;
    for (let i = 1; i < data.length; i++) {
      const { error: delErr } = await supabase
        .from('students')
        .delete()
        .eq('id', data[i].id);

      if (delErr) {
        console.log(`  Cannot delete ${data[i].id}: ${delErr.message}`);
      } else {
        console.log(`  Deleted duplicate: ${data[i].id}`);
      }
    }

    // Verify
    const { data: final } = await supabase
      .from('students')
      .select('id, school_id')
      .eq('profile_id', PROFILE_ID)
      .single();

    console.log('\nFinal result:', final);
  }
}

main().catch(console.error);
