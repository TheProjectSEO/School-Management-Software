import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';

  console.log('=== VERIFICATION ===\n');

  // 1. Check admins school_id
  console.log('1. Admin School IDs:');
  const { data: admins } = await supabase
    .from('admins')
    .select('id, school_id');

  admins?.forEach(a => {
    const match = a.school_id === msuId ? '✅' : '❌';
    console.log(`   ${match} ${a.id}: ${a.school_id}`);
  });

  // 2. Check sections in MSU
  console.log('\n2. Sections in MSU (', msuId, '):');
  const { data: sections, error } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .eq('school_id', msuId);

  if (error) {
    console.log('   Error:', error.message);
  } else {
    console.log('   Found:', sections?.length || 0, 'sections');
    sections?.forEach(s => {
      console.log(`   - ${s.name} (Grade ${s.grade_level})`);
      console.log(`     ID: ${s.id}`);
    });
  }

  // 3. Check all schools
  console.log('\n3. All Schools:');
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name');

  schools?.forEach(s => {
    const isMsu = s.id === msuId ? ' ← MSU' : '';
    console.log(`   - ${s.name}${isMsu}`);
    console.log(`     ID: ${s.id}`);
  });

  console.log('\n=== RESULT ===\n');
  const allAdminsCorrect = admins?.every(a => a.school_id === msuId);
  const hasSections = sections && sections.length > 0;

  if (allAdminsCorrect && hasSections) {
    console.log('✅ Admin school_id matches section school_id');
    console.log('   The admin should now be able to see the sections!');
    console.log('\n   Please refresh the admin panel and try again.');
  } else {
    console.log('❌ Still mismatched - more investigation needed');
  }
}

verify();
