import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function moveTeachers() {
  const supabase = createAdminClient();
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';

  console.log('=== MOVING ALL TEACHERS TO MINDANAO STATE UNIVERSITY ===\n');

  // Get target school name
  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', targetSchoolId)
    .single();

  console.log('Target School:', school?.name);
  console.log('School ID:', targetSchoolId);
  console.log('');

  // Get all teachers
  const { data: teachers, error: fetchError } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  if (fetchError) {
    console.error('Error fetching teachers:', fetchError.message);
    return;
  }

  console.log('Teachers to move:', teachers?.length || 0);
  console.log('');

  // Update all teachers to the target school
  const { data: updated, error: updateError } = await supabase
    .from('teacher_profiles')
    .update({ school_id: targetSchoolId })
    .neq('school_id', targetSchoolId)
    .select('id');

  if (updateError) {
    console.error('Error updating teachers:', updateError.message);
    return;
  }

  console.log('✅ Moved', updated?.length || 0, 'teachers to', school?.name);
  console.log('');

  // Verify
  console.log('=== VERIFICATION ===\n');

  const { data: verifyTeachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  for (const t of verifyTeachers || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', t.profile_id)
      .single();

    const status = t.school_id === targetSchoolId ? '✅' : '❌';
    console.log(`${status} Teacher: ${profile?.full_name || 'N/A'} - School ID: ${t.school_id}`);
  }

  console.log('\n=== DONE ===\n');
}

moveTeachers();
