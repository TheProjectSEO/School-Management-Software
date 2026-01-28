import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const schoolId = '11111111-1111-1111-1111-111111111111';

  console.log('=== ALL TEACHERS IN SYSTEM ===\n');
  const { data: allTeachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  if (!allTeachers || allTeachers.length === 0) {
    console.log('No teachers found in the entire system!\n');
  } else {
    for (const t of allTeachers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', t.profile_id)
        .single();

      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', t.school_id)
        .single();

      console.log('Teacher:', profile?.full_name || 'N/A');
      console.log('  School:', school?.name || t.school_id);
      console.log('  Teacher ID:', t.id);
      console.log('  School ID:', t.school_id);
      console.log('');
    }
    console.log('Total teachers in system:', allTeachers.length);
  }

  console.log('\n=== SECTION INFO ===\n');
  const { data: section } = await supabase
    .from('sections')
    .select('name, adviser_teacher_id, school_id')
    .eq('id', sectionId)
    .single();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', section?.school_id)
    .single();

  console.log('Section:', section?.name);
  console.log('School:', school?.name || section?.school_id);
  console.log('Adviser:', section?.adviser_teacher_id || 'NOT ASSIGNED');

  console.log('\n=== GRADE 12 STEM A COURSES STATUS ===\n');
  const { data: courses } = await supabase
    .from('courses')
    .select('name, teacher_id')
    .eq('section_id', sectionId)
    .order('name');

  const assigned = courses?.filter(c => c.teacher_id) || [];
  const unassigned = courses?.filter(c => !c.teacher_id) || [];

  console.log('Total courses:', courses?.length || 0);
  console.log('With teacher:', assigned.length);
  console.log('Without teacher:', unassigned.length);
}

check();
