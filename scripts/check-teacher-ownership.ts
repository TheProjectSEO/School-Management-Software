import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING TEACHER OWNERSHIP ===\n');

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  // Get assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, created_by')
    .eq('id', assessmentId)
    .single();

  console.log('Assessment:');
  console.log('  ID:', assessment?.id);
  console.log('  Title:', assessment?.title);
  console.log('  created_by (teacher_profile_id):', assessment?.created_by);

  // Get the teacher profile that owns this
  if (assessment?.created_by) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id, profile_id')
      .eq('id', assessment.created_by)
      .single();

    console.log('\nOwning Teacher Profile:');
    console.log('  teacher_profile.id:', teacherProfile?.id);
    console.log('  teacher_profile.profile_id:', teacherProfile?.profile_id);

    if (teacherProfile?.profile_id) {
      const { data: schoolProfile } = await supabase
        .from('school_profiles')
        .select('id, full_name, auth_user_id')
        .eq('id', teacherProfile.profile_id)
        .single();

      console.log('\nSchool Profile:');
      console.log('  full_name:', schoolProfile?.full_name);
      console.log('  auth_user_id:', schoolProfile?.auth_user_id);
    }
  }

  // List all teacher profiles
  console.log('\n=== ALL TEACHER PROFILES ===');
  const { data: allTeachers } = await supabase
    .from('teacher_profiles')
    .select(`
      id,
      profile_id,
      profile:school_profiles(full_name, auth_user_id)
    `);

  allTeachers?.forEach((t: any, i) => {
    console.log(`\n${i + 1}. ${t.profile?.full_name || 'Unknown'}`);
    console.log(`   teacher_profile.id: ${t.id}`);
    console.log(`   profile_id: ${t.profile_id}`);
    console.log(`   auth_user_id: ${t.profile?.auth_user_id}`);
  });
}

check();
