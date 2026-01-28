import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function getConstraint() {
  const supabase = createAdminClient();

  console.log('=== GETTING CONSTRAINT DEFINITION ===\n');

  // Query information_schema to find check constraints
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'teacher_assessment_questions'::regclass
        AND contype = 'c';
    `
  });

  if (error) {
    console.log('RPC error:', error.message);

    // Try an alternative approach - just select from the table to see its structure
    console.log('\nTrying to get table columns...');

    const { data: cols, error: colError } = await supabase
      .from('teacher_assessment_questions')
      .select('*')
      .limit(0);

    if (colError) {
      console.log('Select error:', colError.message);
    } else {
      console.log('Table exists, columns are accessible');
    }

    // Try inserting with no question_type to see error message
    console.log('\nTrying insert with blank question_type to get error message:');
    const { error: insertError } = await supabase
      .from('teacher_assessment_questions')
      .insert({
        assessment_id: '445892ed-586d-45e2-a548-b8684bda4fae',
        question_text: 'Test',
        question_type: '',
        points: 1,
        order_index: 0
      });

    if (insertError) {
      console.log('Full error:', JSON.stringify(insertError, null, 2));
    }

    // Try with NULL
    console.log('\nTrying insert with NULL question_type:');
    const { error: nullError } = await supabase
      .from('teacher_assessment_questions')
      .insert({
        assessment_id: '445892ed-586d-45e2-a548-b8684bda4fae',
        question_text: 'Test',
        question_type: null as any,
        points: 1,
        order_index: 0
      });

    if (nullError) {
      console.log('Full error:', JSON.stringify(nullError, null, 2));
    }

    return;
  }

  console.log('Constraints:', data);
}

getConstraint();
