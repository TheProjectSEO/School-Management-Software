import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING SCHOOL ASSIGNMENTS ===\n');

  // 1. Check Grade 12 STEM A section
  console.log('=== 1. SECTION: Grade 12 - STEM A ===\n');
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, school_id')
    .ilike('name', '%12%STEM%A%')
    .single();

  if (section) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', section.school_id)
      .single();

    console.log('Section:', section.name);
    console.log('Section ID:', section.id);
    console.log('School ID:', section.school_id);
    console.log('School Name:', school?.name || 'Unknown');
  } else {
    console.log('Section not found!');
  }

  // 2. Check teacher Felicity
  console.log('\n=== 2. TEACHER: Felicity ===\n');

  // Search in school_profiles
  const { data: felicityProfiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id')
    .ilike('full_name', '%feli%');

  console.log('Found profiles matching "feli":');
  for (const p of felicityProfiles || []) {
    console.log('  Name:', p.full_name);
    console.log('  Role:', p.role);
    console.log('  Profile ID:', p.id);

    // Check if has teacher_profile
    const { data: tp } = await supabase
      .from('teacher_profiles')
      .select('id, school_id')
      .eq('profile_id', p.id)
      .single();

    if (tp) {
      const { data: tpSchool } = await supabase
        .from('schools')
        .select('name')
        .eq('id', tp.school_id)
        .single();

      console.log('  Teacher Profile ID:', tp.id);
      console.log('  Teacher School ID:', tp.school_id);
      console.log('  Teacher School Name:', tpSchool?.name || 'Unknown');
    } else {
      console.log('  Teacher Profile: NOT FOUND');
    }
    console.log('');
  }

  // 3. List all teachers and their schools
  console.log('=== 3. ALL TEACHERS AND THEIR SCHOOLS ===\n');

  const { data: allTeachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  for (const t of allTeachers || []) {
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('full_name')
      .eq('id', t.profile_id)
      .single();

    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', t.school_id)
      .single();

    const isCorrectSchool = t.school_id === section?.school_id ? '✅' : '❌';
    console.log(`${isCorrectSchool} ${sp?.full_name || 'N/A'}`);
    console.log(`   School: ${school?.name || 'Unknown'} (${t.school_id})`);
    console.log('');
  }

  // 4. List all schools
  console.log('=== 4. ALL SCHOOLS ===\n');
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name');

  schools?.forEach(s => {
    const isTarget = s.id === section?.school_id ? '← Section is here' : '';
    console.log(`  ${s.name} ${isTarget}`);
    console.log(`  ID: ${s.id}`);
    console.log('');
  });
}

check();
