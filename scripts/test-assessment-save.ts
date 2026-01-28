import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function test() {
  const supabase = createAdminClient();

  console.log('=== TESTING ASSESSMENT SAVE ===\n');

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  // Check if available_from column exists
  console.log('1. Checking available_from column...');
  const { error: colError } = await supabase
    .from('assessments')
    .select('available_from')
    .limit(1);

  if (colError) {
    console.log('   ❌ Column does not exist:', colError.message);
  } else {
    console.log('   ✅ Column exists');
  }

  // Try to update an assessment
  console.log('\n2. Testing assessment update...');
  const { data: updateResult, error: updateError } = await supabase
    .from('assessments')
    .update({
      title: 'Quiz',
      instructions: 'Test instructions',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      time_limit_minutes: 30,
      max_attempts: 1,
      total_points: 3,
      updated_at: new Date().toISOString()
    })
    .eq('id', assessmentId)
    .select()
    .single();

  if (updateError) {
    console.log('   ❌ Update failed:', updateError.message);
  } else {
    console.log('   ✅ Update successful');
    console.log('   Title:', updateResult?.title);
  }

  // Try to insert a question with true_false type
  console.log('\n3. Testing question insert with true_false type...');

  // First delete test questions
  await supabase
    .from('teacher_assessment_questions')
    .delete()
    .eq('assessment_id', assessmentId)
    .eq('question_text', 'Test Question');

  const { error: qError } = await supabase
    .from('teacher_assessment_questions')
    .insert({
      assessment_id: assessmentId,
      question_text: 'Test Question',
      question_type: 'true_false',
      choices_json: ['Option A', 'Option B'],
      answer_key_json: { correctIndex: 0 },
      points: 1,
      order_index: 99
    });

  if (qError) {
    console.log('   ❌ Insert failed:', qError.message);
  } else {
    console.log('   ✅ Insert successful');
    // Cleanup
    await supabase
      .from('teacher_assessment_questions')
      .delete()
      .eq('assessment_id', assessmentId)
      .eq('question_text', 'Test Question');
  }

  // Check current assessment state
  console.log('\n4. Current assessment state:');
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, status, total_points, created_by')
    .eq('id', assessmentId)
    .single();

  console.log('   ', JSON.stringify(assessment, null, 2));
}

test();
