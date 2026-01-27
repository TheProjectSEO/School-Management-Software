import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING QUESTION TYPES ===\n');

  // Try to get existing questions to see what types exist
  const { data: existingQuestions, error: queryError } = await supabase
    .from('teacher_assessment_questions')
    .select('question_type')
    .limit(10);

  console.log('Existing question types:', existingQuestions?.map(q => q.question_type) || []);

  // Try different question type values
  const testTypes = [
    'multiple_choice',
    'MultipleChoice',
    'MULTIPLE_CHOICE',
    'mc',
    'mcq',
    'choice',
    'quiz',
    'question'
  ];

  console.log('\nTrying different question_type values:');

  for (const type of testTypes) {
    const { error } = await supabase
      .from('teacher_assessment_questions')
      .insert({
        assessment_id: '445892ed-586d-45e2-a548-b8684bda4fae',
        question_text: 'Test',
        question_type: type,
        points: 1,
        order_index: 0
      });

    if (error) {
      if (error.message.includes('question_type_check')) {
        console.log(`  "${type}": ❌ Invalid`);
      } else {
        console.log(`  "${type}": ❌ ${error.message.substring(0, 50)}`);
      }
    } else {
      console.log(`  "${type}": ✅ VALID`);
      // Delete the test row
      await supabase
        .from('teacher_assessment_questions')
        .delete()
        .eq('question_text', 'Test')
        .eq('question_type', type);
    }
  }

  // Check the information_schema for the constraint
  console.log('\nNote: The check constraint defines valid values.');
  console.log('Check the Supabase dashboard for the exact constraint definition.');
}

check();
