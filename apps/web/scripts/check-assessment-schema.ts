import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function checkSchema() {
  const supabase = createAdminClient();

  console.log('\n=== ASSESSMENT SCHEMA CHECK ===\n');

  // Check if assessment_questions table exists
  const { data: aq, error: aqErr } = await supabase
    .from('assessment_questions')
    .select('*')
    .limit(1);
  console.log('1. assessment_questions table:', aqErr ? 'MISSING - ' + aqErr.message : 'EXISTS');

  // Check if questions table exists
  const { data: q, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .limit(1);
  console.log('2. questions table:', qErr ? 'MISSING - ' + qErr.message : 'EXISTS');

  // Check if teacher_assessment_questions table exists
  const { data: taq, error: taqErr } = await supabase
    .from('teacher_assessment_questions')
    .select('*')
    .limit(1);
  console.log('3. teacher_assessment_questions table:', taqErr ? 'MISSING - ' + taqErr.message : 'EXISTS');

  // Check if answer_options table exists
  const { data: ao, error: aoErr } = await supabase
    .from('answer_options')
    .select('*')
    .limit(1);
  console.log('4. answer_options table:', aoErr ? 'MISSING - ' + aoErr.message : 'EXISTS');

  // Check assessments table columns
  console.log('\n--- Assessments Columns ---');
  const { data: aTest, error: aErr } = await supabase
    .from('assessments')
    .select('id, title, type, instructions, max_attempts, time_limit_minutes, status, created_by, updated_at, school_id, course_id, section_id, due_date, total_points')
    .limit(1);

  if (aErr) {
    console.log('ERROR:', aErr.message);
  } else {
    console.log('All columns exist: OK');
  }

  // Check teacher_assessment_questions columns if it exists
  if (!taqErr) {
    console.log('\n--- teacher_assessment_questions Columns ---');
    const { data: taqCols, error: taqColErr } = await supabase
      .from('teacher_assessment_questions')
      .select('id, assessment_id, question_text, question_type, choices_json, answer_key_json, points, difficulty, tags, explanation, order_index')
      .limit(1);

    if (taqColErr) {
      console.log('Column check ERROR:', taqColErr.message);
    } else {
      console.log('All columns exist: OK');
    }
  }

  // Check questions table columns if it exists
  if (!qErr) {
    console.log('\n--- questions Columns ---');
    const { data: qCols, error: qColErr } = await supabase
      .from('questions')
      .select('id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index')
      .limit(1);

    if (qColErr) {
      console.log('Column check ERROR:', qColErr.message);
    } else {
      console.log('All columns exist: OK');
    }
  }
}

checkSchema();
