import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fixConstraint() {
  const supabase = createAdminClient();

  console.log('=== FIXING QUESTION TYPE CONSTRAINT ===\n');

  // First, try to get the current constraint by attempting various inserts
  const testTypes = [
    'multiple_choice',
    'true_false',
    'short_answer',
    'essay',
    'mcq',
    'fill_in_blank',
    'matching',
    'ordering',
    'text'
  ];

  console.log('Testing which question types are currently valid...');
  const validTypes: string[] = [];

  for (const type of testTypes) {
    const { data, error } = await supabase
      .from('teacher_assessment_questions')
      .insert({
        assessment_id: '445892ed-586d-45e2-a548-b8684bda4fae',
        question_text: `Test question for ${type}`,
        question_type: type,
        points: 1,
        order_index: 999
      })
      .select('id')
      .single();

    if (error) {
      console.log(`  "${type}": ❌ Invalid`);
    } else {
      console.log(`  "${type}": ✅ Valid`);
      validTypes.push(type);
      // Delete the test row
      if (data) {
        await supabase
          .from('teacher_assessment_questions')
          .delete()
          .eq('id', data.id);
      }
    }
  }

  console.log('\nCurrently valid types:', validTypes.length > 0 ? validTypes.join(', ') : 'NONE');

  if (validTypes.length === 0) {
    console.log('\n⚠️ No question types are valid!');
    console.log('The constraint may be too restrictive or incorrectly configured.');
    console.log('\nYou need to run this SQL in Supabase SQL Editor:');
    console.log(`
-- Drop the existing constraint
ALTER TABLE teacher_assessment_questions
DROP CONSTRAINT IF EXISTS teacher_assessment_questions_question_type_check;

-- Add the correct constraint
ALTER TABLE teacher_assessment_questions
ADD CONSTRAINT teacher_assessment_questions_question_type_check
CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay'));
    `);
  } else if (!validTypes.includes('multiple_choice')) {
    console.log('\n⚠️ "multiple_choice" is not a valid type!');
    console.log('The app expects "multiple_choice" to be valid.');
    console.log('\nYou need to update the constraint in Supabase SQL Editor.');
  } else {
    console.log('\n✅ "multiple_choice" is valid! Questions should work.');
  }
}

fixConstraint();
