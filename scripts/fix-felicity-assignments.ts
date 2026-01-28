import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const felicityTeacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  console.log('=== FIXING FELICITY COURSE ASSIGNMENTS ===\n');

  // 1. Get all courses in Grade 12 - STEM A
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', grade12StemAId);

  if (error || !courses) {
    console.log('Error fetching courses:', error?.message);
    return;
  }

  console.log('Found', courses.length, 'courses in Grade 12 - STEM A');

  // 2. Create teacher_course_sections assignments for Felicity
  console.log('\nAssigning courses to Felicity...\n');

  let successCount = 0;
  for (const course of courses) {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('teacher_course_sections')
      .select('id')
      .eq('teacher_id', felicityTeacherId)
      .eq('course_id', course.id)
      .eq('section_id', grade12StemAId)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭️ ${course.name} - already assigned`);
      continue;
    }

    // Create new assignment
    const { error: insertError } = await supabase
      .from('teacher_course_sections')
      .insert({
        teacher_id: felicityTeacherId,
        course_id: course.id,
        section_id: grade12StemAId,
        school_id: msuId,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.log(`  ❌ ${course.name} - Error:`, insertError.message);
    } else {
      console.log(`  ✅ ${course.name} - assigned`);
      successCount++;
    }
  }

  // 3. Also update courses table teacher_id
  console.log('\nUpdating courses table teacher_id...');

  const courseIds = courses.map(c => c.id);
  const { error: updateError } = await supabase
    .from('courses')
    .update({ teacher_id: felicityTeacherId })
    .in('id', courseIds);

  if (updateError) {
    console.log('  ❌ Error updating courses:', updateError.message);
  } else {
    console.log('  ✅ Updated', courseIds.length, 'courses with teacher_id');
  }

  // 4. Make Felicity the adviser of Grade 12 - STEM A
  console.log('\nSetting Felicity as section adviser...');

  const { data: existingAdviser } = await supabase
    .from('section_advisers')
    .select('id')
    .eq('section_id', grade12StemAId)
    .maybeSingle();

  if (existingAdviser) {
    // Update existing
    const { error: adviserError } = await supabase
      .from('section_advisers')
      .update({ teacher_id: felicityTeacherId })
      .eq('id', existingAdviser.id);

    if (adviserError) {
      console.log('  ❌ Error updating adviser:', adviserError.message);
    } else {
      console.log('  ✅ Updated section adviser');
    }
  } else {
    // Create new
    const { error: adviserError } = await supabase
      .from('section_advisers')
      .insert({
        teacher_id: felicityTeacherId,
        section_id: grade12StemAId,
        school_id: msuId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (adviserError) {
      console.log('  ❌ Error creating adviser:', adviserError.message);
    } else {
      console.log('  ✅ Created section adviser');
    }
  }

  // 5. Verify
  console.log('\n=== VERIFICATION ===\n');

  const { data: assignments } = await supabase
    .from('teacher_course_sections')
    .select('id, course_id')
    .eq('teacher_id', felicityTeacherId);

  console.log('Felicity course assignments:', assignments?.length || 0);

  const { data: advisories } = await supabase
    .from('section_advisers')
    .select('id, section_id')
    .eq('teacher_id', felicityTeacherId);

  console.log('Felicity advisory sections:', advisories?.length || 0);

  // Get student count
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', grade12StemAId);

  console.log('Students in Grade 12 - STEM A:', studentCount || 0);

  console.log('\n✅ Felicity should now see:');
  console.log('   - ' + (assignments?.length || 0) + ' courses');
  console.log('   - ' + (studentCount || 0) + ' students');
  console.log('   - 1 advisory section');
}

fix();
