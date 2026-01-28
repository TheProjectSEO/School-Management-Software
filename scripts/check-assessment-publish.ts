import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';
  const felicityTeacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  console.log('=== CHECKING ASSESSMENT FOR PUBLISH ===\n');

  // 1. Get the assessment
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .single();

  if (error) {
    console.log('❌ Error fetching assessment:', error.message);
    return;
  }

  console.log('Assessment:');
  console.log('  ID:', assessment.id);
  console.log('  Title:', assessment.title);
  console.log('  Status:', assessment.status);
  console.log('  Created By:', assessment.created_by);

  // 2. Check if already published
  if (assessment.status === 'published') {
    console.log('\n❌ ISSUE: Assessment is already published!');
    console.log('   The publish endpoint returns 400 if already published.');
  }

  // 3. Check if created_by matches Felicity
  console.log('\n Checking ownership:');
  console.log('  Assessment created_by:', assessment.created_by);
  console.log('  Felicity teacher_id:', felicityTeacherId);

  if (assessment.created_by !== felicityTeacherId) {
    console.log('\n❌ ISSUE: created_by does NOT match Felicity!');
    console.log('   The publish endpoint requires created_by to match the teacher.');

    // Find who it belongs to
    if (assessment.created_by) {
      const { data: creator } = await supabase
        .from('teacher_profiles')
        .select('id, profile_id')
        .eq('id', assessment.created_by)
        .single();

      if (creator) {
        const { data: profile } = await supabase
          .from('school_profiles')
          .select('full_name')
          .eq('id', creator.profile_id)
          .single();
        console.log('   Actually belongs to:', profile?.full_name || 'Unknown');
      }
    } else {
      console.log('   created_by is NULL');
    }
  } else {
    console.log('  ✅ Ownership matches');
  }

  // 4. Get questions
  console.log('\nQuestions:');
  const { data: questions } = await supabase
    .from('teacher_assessment_questions')
    .select('id, question_text')
    .eq('assessment_id', assessmentId);

  console.log('  Count:', questions?.length || 0);

  // 5. Suggest fix
  console.log('\n=== FIX ===\n');

  if (assessment.status === 'published') {
    console.log('Assessment is already published. No fix needed.');
  } else if (assessment.created_by !== felicityTeacherId) {
    console.log('Need to update created_by to match Felicity:');

    const { error: updateError } = await supabase
      .from('assessments')
      .update({ created_by: felicityTeacherId })
      .eq('id', assessmentId);

    if (updateError) {
      console.log('  ❌ Error updating:', updateError.message);
    } else {
      console.log('  ✅ Updated created_by to Felicity');
      console.log('  Try publishing again!');
    }
  }
}

check();
