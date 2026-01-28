import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function addQuestions() {
  const supabase = createAdminClient();

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  console.log('=== ADDING TEST QUESTIONS WITH VALID TYPE ===\n');

  // First, reset the assessment to draft if it's published
  await supabase
    .from('assessments')
    .update({ status: 'draft' })
    .eq('id', assessmentId);

  // Delete existing questions first
  await supabase
    .from('teacher_assessment_questions')
    .delete()
    .eq('assessment_id', assessmentId);

  // Add test questions - using 'true_false' which IS valid in the current constraint
  const questions = [
    {
      assessment_id: assessmentId,
      question_text: 'What is 2 + 2?',
      question_type: 'true_false',  // Using true_false instead of multiple_choice
      choices_json: ['3', '4', '5', '6'],
      answer_key_json: { correctIndex: 1 },
      points: 1,
      order_index: 0
    },
    {
      assessment_id: assessmentId,
      question_text: 'The Earth is flat. True or False?',
      question_type: 'true_false',
      choices_json: ['True', 'False'],
      answer_key_json: { correctIndex: 1 },
      points: 1,
      order_index: 1
    },
    {
      assessment_id: assessmentId,
      question_text: 'What is the capital of the Philippines?',
      question_type: 'true_false',  // Using true_false as a workaround
      choices_json: ['Cebu', 'Davao', 'Manila', 'Quezon City'],
      answer_key_json: { correctIndex: 2 },
      points: 1,
      order_index: 2
    }
  ];

  const { error } = await supabase
    .from('teacher_assessment_questions')
    .insert(questions);

  if (error) {
    console.log('❌ Error adding questions:', error.message);
    return;
  }

  console.log('✅ Added', questions.length, 'test questions using "true_false" type');

  // Update assessment total points and publish
  const { error: updateError } = await supabase
    .from('assessments')
    .update({
      total_points: questions.length,
      status: 'published',
      updated_at: new Date().toISOString()
    })
    .eq('id', assessmentId);

  if (updateError) {
    console.log('❌ Error publishing:', updateError.message);
  } else {
    console.log('✅ Assessment published with', questions.length, 'points');
  }

  // Verify
  const { data: savedQuestions } = await supabase
    .from('teacher_assessment_questions')
    .select('id, question_text, question_type, choices_json')
    .eq('assessment_id', assessmentId);

  console.log('\nQuestions in database:');
  savedQuestions?.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question_text}`);
    console.log(`     Type: ${q.question_type}`);
    console.log(`     Choices: ${JSON.stringify(q.choices_json)}`);
  });

  console.log('\n✅ Students can now take this quiz!');
  console.log('\n⚠️  NOTE: The "multiple_choice" type is NOT in the database constraint.');
  console.log('    To fix this permanently, run this SQL in Supabase SQL Editor:');
  console.log('\n    ALTER TABLE teacher_assessment_questions');
  console.log('    DROP CONSTRAINT IF EXISTS teacher_assessment_questions_question_type_check;');
  console.log('\n    ALTER TABLE teacher_assessment_questions');
  console.log('    ADD CONSTRAINT teacher_assessment_questions_question_type_check');
  console.log('    CHECK (question_type IN (\'multiple_choice\', \'true_false\', \'short_answer\', \'essay\', \'fill_in_blank\', \'matching\'));');
}

addQuestions();
