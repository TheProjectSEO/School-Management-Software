import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING TEACHER-RELATED TABLES ===\n');

  // 1. Check courses table structure
  console.log('1. COURSES TABLE (sample row):');
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .limit(1)
    .single();

  if (courseError) {
    console.log('   Error:', courseError.message);
  } else {
    console.log('   Columns:', Object.keys(course || {}));
  }

  // 2. Check section_advisers
  console.log('\n2. SECTION_ADVISERS TABLE:');
  const { data: adviser, error: adviserError } = await supabase
    .from('section_advisers')
    .select('*')
    .limit(1);

  if (adviserError) {
    console.log('   Error:', adviserError.message);
  } else if (adviser && adviser.length > 0) {
    console.log('   Columns:', Object.keys(adviser[0]));
    console.log('   Sample:', adviser[0]);
  } else {
    console.log('   Table exists but is empty');
    // Try to see structure via insert error
    const { error: insertError } = await supabase
      .from('section_advisers')
      .insert({ dummy: 'test' });
    console.log('   Insert error (shows structure):', insertError?.message);
  }

  // 3. Check if there's a different table for teacher assignments
  console.log('\n3. LOOKING FOR TEACHER ASSIGNMENT TABLES:');

  // Try different possible table names
  const possibleTables = [
    'teacher_courses',
    'course_teachers',
    'teacher_assignments',
    'teaching_assignments',
    'class_assignments'
  ];

  for (const table of possibleTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`   ✅ ${table} exists`);
    }
  }

  // 4. Check how teacher data is fetched in the app - look at courses with teacher_id
  console.log('\n4. COURSES WITH TEACHER_ID:');
  const { data: coursesWithTeacher } = await supabase
    .from('courses')
    .select('id, name, teacher_id, section_id')
    .not('teacher_id', 'is', null)
    .limit(5);

  console.log('   Found:', coursesWithTeacher?.length || 0);
  coursesWithTeacher?.forEach(c => {
    console.log(`   - ${c.name}: teacher_id=${c.teacher_id}`);
  });

  // 5. Check Felicity's teacher profile ID format
  console.log('\n5. FELICITY TEACHER PROFILE:');
  const { data: felicity } = await supabase
    .from('teacher_profiles')
    .select('*')
    .eq('id', '75270e27-9d3d-4b28-ac7c-4677bec6e8e9')
    .single();

  if (felicity) {
    console.log('   Columns:', Object.keys(felicity));
    console.log('   ID:', felicity.id);
    console.log('   Profile ID:', felicity.profile_id);
  }

  // 6. Check if courses use profile_id or teacher_profile_id
  console.log('\n6. TEACHER ID FORMAT IN COURSES:');
  const { data: sampleCourses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .not('teacher_id', 'is', null)
    .limit(3);

  for (const c of sampleCourses || []) {
    // Check if teacher_id matches a teacher_profiles.id
    const { data: tp } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('id', c.teacher_id)
      .maybeSingle();

    // Check if it matches school_profiles.id
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('id, full_name')
      .eq('id', c.teacher_id)
      .maybeSingle();

    console.log(`   ${c.name}:`);
    console.log(`     teacher_id: ${c.teacher_id}`);
    console.log(`     Matches teacher_profiles: ${tp ? 'YES' : 'NO'}`);
    console.log(`     Matches school_profiles: ${sp ? 'YES (' + sp.full_name + ')' : 'NO'}`);
  }
}

check();
