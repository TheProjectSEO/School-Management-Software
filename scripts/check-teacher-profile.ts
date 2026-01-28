import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  const teacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  console.log('=== CHECKING TEACHER PROFILE ===\n');

  // Get teacher profile
  const { data: teacher, error } = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('id', teacherId)
    .single();

  if (error) {
    console.log('❌ Error finding teacher:', error.message);
    return;
  }

  console.log('Teacher Profile:');
  console.log(JSON.stringify(teacher, null, 2));

  // Get school profile
  if (teacher.profile_id) {
    const { data: profile, error: pError } = await supabase
      .from('school_profiles')
      .select('*')
      .eq('id', teacher.profile_id)
      .single();

    if (pError) {
      console.log('\n❌ Error finding school profile:', pError.message);
    } else {
      console.log('\nSchool Profile:');
      console.log(JSON.stringify(profile, null, 2));
    }
  } else {
    console.log('\n⚠️ No profile_id on teacher record');
  }
}

check();
