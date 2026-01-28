import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  console.log('=== CHECKING ASSESSMENT STATUS ===\n');

  // Get assessment
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('id, title, status, created_by, total_points')
    .eq('id', assessmentId)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('Assessment:');
  console.log('  ID:', assessment.id);
  console.log('  Title:', assessment.title);
  console.log('  Status:', assessment.status);
  console.log('  Created By (teacher_id):', assessment.created_by);
  console.log('  Total Points:', assessment.total_points);

  // Get questions count
  const { count } = await supabase
    .from('teacher_assessment_questions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId);

  console.log('  Questions:', count || 0);

  // Check teacher info
  if (assessment.created_by) {
    const { data: teacher } = await supabase
      .from('teacher_profiles')
      .select('id, profile_id')
      .eq('id', assessment.created_by)
      .single();

    if (teacher) {
      const { data: profile } = await supabase
        .from('school_profiles')
        .select('full_name, email')
        .eq('id', teacher.profile_id)
        .single();

      console.log('\nOwner Teacher:');
      console.log('  Name:', profile?.full_name);
      console.log('  Email:', profile?.email);
    }
  }

  // Summary
  console.log('\n=== STATUS ===');
  if (assessment.status === 'published') {
    console.log('✅ Assessment is ALREADY PUBLISHED');
    console.log('   The teacher does not need to publish again.');
    console.log('   Students can take this quiz now.');
    console.log('\n   If the UI shows "Publish" button, it might not be');
    console.log('   refreshing the assessment state properly.');
  } else {
    console.log('⚠️ Assessment is in:', assessment.status);
    console.log('   Teacher needs to publish it first.');
  }
}

check();
