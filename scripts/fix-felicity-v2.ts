import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const felicityTeacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  console.log('=== FIXING FELICITY ASSIGNMENTS ===\n');

  // 1. Check teacher_assignments table structure
  console.log('1. TEACHER_ASSIGNMENTS TABLE:');
  const { data: taData, error: taError } = await supabase
    .from('teacher_assignments')
    .select('*')
    .limit(1);

  if (taError) {
    console.log('   Error:', taError.message);
  } else if (taData && taData.length > 0) {
    console.log('   Columns:', Object.keys(taData[0]));
    console.log('   Sample:', taData[0]);
  } else {
    console.log('   Table is empty');
  }

  // 2. Update courses.teacher_id for Grade 12 - STEM A
  console.log('\n2. UPDATING COURSES:');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', grade12StemAId);

  console.log('   Found', courses?.length || 0, 'courses');

  if (courses && courses.length > 0) {
    const courseIds = courses.map(c => c.id);

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        teacher_id: felicityTeacherId,
        updated_at: new Date().toISOString()
      })
      .in('id', courseIds);

    if (updateError) {
      console.log('   ❌ Error:', updateError.message);
    } else {
      console.log('   ✅ Updated', courseIds.length, 'courses with teacher_id');
    }
  }

  // 3. Also create teacher_assignments if the table uses it
  console.log('\n3. CREATING TEACHER_ASSIGNMENTS:');

  for (const course of courses || []) {
    const { error: insertError } = await supabase
      .from('teacher_assignments')
      .upsert({
        teacher_id: felicityTeacherId,
        course_id: course.id,
        section_id: grade12StemAId,
        school_id: msuId,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'teacher_id,course_id,section_id'
      });

    if (insertError) {
      // Try without onConflict if it doesn't have that constraint
      const { error: retryError } = await supabase
        .from('teacher_assignments')
        .insert({
          teacher_id: felicityTeacherId,
          course_id: course.id,
          section_id: grade12StemAId,
          school_id: msuId,
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (retryError && !retryError.message.includes('duplicate')) {
        console.log(`   ❌ ${course.name}: ${retryError.message}`);
      } else {
        console.log(`   ✅ ${course.name}`);
      }
    } else {
      console.log(`   ✅ ${course.name}`);
    }
  }

  // 4. Verify section_advisers (already exists)
  console.log('\n4. SECTION ADVISER:');
  const { data: adviser } = await supabase
    .from('section_advisers')
    .select('*')
    .eq('teacher_profile_id', felicityTeacherId)
    .eq('section_id', grade12StemAId);

  if (adviser && adviser.length > 0) {
    console.log('   ✅ Felicity is already adviser for Grade 12 - STEM A');
  } else {
    console.log('   ❌ Not set as adviser, creating...');
    await supabase.from('section_advisers').insert({
      teacher_profile_id: felicityTeacherId,
      section_id: grade12StemAId,
      school_id: msuId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // 5. Final verification
  console.log('\n=== VERIFICATION ===\n');

  const { data: updatedCourses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', grade12StemAId);

  const assignedCourses = updatedCourses?.filter(c => c.teacher_id === felicityTeacherId);
  console.log('Courses assigned to Felicity:', assignedCourses?.length || 0);

  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', grade12StemAId);

  console.log('Students in Grade 12 - STEM A:', studentCount || 0);

  const { data: taCount } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', felicityTeacherId);

  console.log('Teacher assignments:', taCount?.length || 0);

  console.log('\n✅ Felicity should now see data when logged in!');
}

fix();
