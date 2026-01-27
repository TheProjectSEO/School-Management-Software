import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function test() {
  const supabase = createAdminClient();

  // Get an existing assessment
  const { data: assessments, error: listErr } = await supabase
    .from('assessments')
    .select('id, title')
    .limit(1);

  if (listErr) {
    console.log('Error listing assessments:', listErr.message);
    return;
  }

  if (!assessments || assessments.length === 0) {
    console.log('No assessments found');
    return;
  }

  const assessmentId = assessments[0].id;
  console.log(`Testing with assessment: ${assessments[0].title} (${assessmentId})\n`);

  // Test the same query the API uses
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select(`
      *,
      courses:course_id (
        id,
        name,
        subject_code
      ),
      sections:section_id (
        id,
        name
      ),
      questions:teacher_assessment_questions (
        id,
        question_text,
        question_type,
        choices_json,
        answer_key_json,
        points,
        order_index
      )
    `)
    .eq('id', assessmentId)
    .single();

  if (error) {
    console.log('ERROR:', error.message);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('SUCCESS!');
    console.log('Assessment:', assessment.title);
    console.log('Course:', assessment.courses?.name || 'N/A');
    console.log('Questions:', assessment.questions?.length || 0);
  }
}

test();
