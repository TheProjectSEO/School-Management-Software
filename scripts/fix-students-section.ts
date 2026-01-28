import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a'; // Grade 12 - STEM A

  console.log('=== CHECKING STUDENTS ===\n');

  // Get all students in MSU
  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id,
      section_id,
      grade_level,
      school_id,
      profile_id
    `)
    .eq('school_id', msuId);

  if (error) {
    console.log('Error fetching students:', error.message);
    return;
  }

  console.log('Students in MSU:', students?.length || 0);

  if (!students || students.length === 0) {
    console.log('No students found in MSU');
    return;
  }

  console.log('\nCurrent assignments:');
  for (const s of students) {
    // Get profile name separately
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name')
      .eq('id', s.profile_id)
      .single();

    const inCorrectSection = s.section_id === grade12StemAId ? '✅' : '❌';
    console.log(`${inCorrectSection} ${profile?.full_name || 'Unknown'}`);
    console.log(`   Section ID: ${s.section_id || 'None'}`);
    console.log(`   Grade: ${s.grade_level}`);
  }

  // Update all students to Grade 12 - STEM A
  console.log('\n=== UPDATING STUDENTS ===\n');

  const studentIds = students.map(s => s.id);

  const { error: updateError } = await supabase
    .from('students')
    .update({
      section_id: grade12StemAId,
      grade_level: '12',
      updated_at: new Date().toISOString()
    })
    .in('id', studentIds);

  if (updateError) {
    console.log('Error updating students:', updateError.message);
    return;
  }

  console.log(`✅ Updated ${studentIds.length} students to Grade 12 - STEM A`);

  // Verify
  console.log('\n=== VERIFICATION ===\n');

  const { data: updated } = await supabase
    .from('students')
    .select('id, section_id, grade_level, profile_id')
    .eq('school_id', msuId);

  for (const s of updated || []) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name')
      .eq('id', s.profile_id)
      .single();

    const correct = s.section_id === grade12StemAId && s.grade_level === '12';
    console.log(`${correct ? '✅' : '❌'} ${profile?.full_name} - Grade ${s.grade_level}, Section: ${s.section_id === grade12StemAId ? 'Grade 12 - STEM A' : s.section_id}`);
  }
}

fix();
