import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  const grade12StemAId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const felicityTeacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  console.log('=== CREATING TEACHER_ASSIGNMENTS ===\n');

  // Get courses in Grade 12 - STEM A
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('section_id', grade12StemAId);

  console.log('Found', courses?.length || 0, 'courses\n');

  for (const course of courses || []) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_profile_id', felicityTeacherId)
      .eq('course_id', course.id)
      .eq('section_id', grade12StemAId)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️ ${course.name} - already assigned`);
      continue;
    }

    // Insert with correct columns
    const { error } = await supabase
      .from('teacher_assignments')
      .insert({
        teacher_profile_id: felicityTeacherId,
        course_id: course.id,
        section_id: grade12StemAId,
        is_primary: true,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.log(`❌ ${course.name}: ${error.message}`);
    } else {
      console.log(`✅ ${course.name}`);
    }
  }

  // Verify
  console.log('\n=== VERIFICATION ===\n');

  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('id, course_id')
    .eq('teacher_profile_id', felicityTeacherId);

  console.log('Teacher assignments for Felicity:', assignments?.length || 0);

  const { data: coursesWithTeacher } = await supabase
    .from('courses')
    .select('id, name')
    .eq('teacher_id', felicityTeacherId);

  console.log('Courses with teacher_id set:', coursesWithTeacher?.length || 0);
}

fix();
