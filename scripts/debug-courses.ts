import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function debug() {
  const supabase = createAdminClient();

  // Check all courses with "STEM" or recently created
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, section_id, school_id, created_at')
    .or('name.ilike.%STEM%,name.ilike.%Calculus%,name.ilike.%Physics%,name.ilike.%Chemistry%')
    .order('created_at', { ascending: false })
    .limit(30);

  console.log('\n=== COURSES WITH STEM/SCIENCE NAMES ===\n');
  courses?.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   Section ID: ${c.section_id}`);
    console.log(`   School ID: ${c.school_id}`);
    console.log(`   Created: ${c.created_at}`);
    console.log('');
  });

  // Check sections with this school
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const targetSectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== TARGET SECTION INFO ===\n');
  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('id', targetSectionId)
    .single();

  console.log('Section:', section);

  // Check courses for this exact section
  const { data: sectionCourses } = await supabase
    .from('courses')
    .select('*')
    .eq('section_id', targetSectionId);

  console.log(`\nCourses for section ${targetSectionId}:`, sectionCourses?.length || 0);
  sectionCourses?.forEach(c => console.log(`  - ${c.name}`));

  // Check enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      course:course_id (
        name,
        section_id
      )
    `)
    .limit(10);

  console.log('\n=== SAMPLE ENROLLMENTS ===\n');
  enrollments?.forEach((e: any) => {
    console.log(`Student: ${e.student_id.substring(0, 8)}... → ${e.course?.name} (Section: ${e.course?.section_id?.substring(0, 8)}...)`);
  });
}

debug();
