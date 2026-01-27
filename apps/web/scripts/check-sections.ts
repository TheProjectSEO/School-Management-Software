import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();
  const schoolId = '11111111-1111-1111-1111-111111111111';

  console.log('=== SECTIONS IN MINDANAO STATE UNIVERSITY ===\n');

  const { data: sections, error } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .eq('school_id', schoolId);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Sections found:', sections?.length || 0);
  sections?.forEach(s => {
    console.log('  -', s.name, '(Grade', s.grade_level + ')');
    console.log('   ID:', s.id);
  });

  // Also check all sections
  console.log('\n=== ALL SECTIONS WITH STEM ===\n');
  const { data: allSections } = await supabase
    .from('sections')
    .select('id, name, school_id');

  const stemSections = allSections?.filter(s => s.name?.toLowerCase().includes('stem')) || [];
  console.log('STEM sections:', stemSections.length);
  stemSections.forEach(s => {
    console.log('  -', s.name);
    console.log('   School ID:', s.school_id);
  });

  if (sections?.length === 0) {
    console.log('\n⚠️  No sections found in Mindanao State University!');
    console.log('Need to create Grade 12 - STEM A section.');
  }
}

check();
