import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING QUESTIONS TABLE ===\n');

  // 1. Check table structure
  console.log('1. TABLE STRUCTURE:');
  const { data: sample, error } = await supabase
    .from('teacher_assessment_questions')
    .select('*')
    .limit(1);

  if (error) {
    console.log('   ❌ Error accessing table:', error.message);
    console.log('   The table might not exist or has wrong name');

    // Try alternative table names
    const alternativeNames = [
      'assessment_questions',
      'questions',
      'quiz_questions'
    ];

    for (const name of alternativeNames) {
      const { error: altError } = await supabase.from(name).select('*').limit(1);
      if (!altError) {
        console.log(`   ✅ Found table: ${name}`);
      }
    }
  } else {
    console.log('   ✅ Table exists');
    if (sample && sample.length > 0) {
      console.log('   Columns:', Object.keys(sample[0]));
    } else {
      console.log('   Table is empty');

      // Try to get columns from insert error
      const { error: insertError } = await supabase
        .from('teacher_assessment_questions')
        .insert({ dummy: 'test' });

      console.log('   Insert test error (shows expected columns):', insertError?.message);
    }
  }

  // 2. Try to insert a test question
  console.log('\n2. TEST INSERT:');

  const testQuestion = {
    assessment_id: 'test-id',
    question_text: 'Test question?',
    question_type: 'multiple_choice',
    choices_json: JSON.stringify(['A', 'B', 'C', 'D']),
    answer_key_json: JSON.stringify({ correct: 0 }),
    points: 1,
    order_index: 0
  };

  const { error: insertError } = await supabase
    .from('teacher_assessment_questions')
    .insert(testQuestion);

  if (insertError) {
    console.log('   Insert error:', insertError.message);
    console.log('   Error code:', insertError.code);
    console.log('   Error details:', insertError.details);
  } else {
    console.log('   ✅ Insert successful');
    // Clean up
    await supabase
      .from('teacher_assessment_questions')
      .delete()
      .eq('assessment_id', 'test-id');
  }

  // 3. Check if there are any questions in the table at all
  console.log('\n3. ALL QUESTIONS IN TABLE:');
  const { data: allQuestions, count } = await supabase
    .from('teacher_assessment_questions')
    .select('*', { count: 'exact' });

  console.log('   Total questions in table:', count || allQuestions?.length || 0);

  // 4. Check canTakeAssessment logic
  console.log('\n4. CHECKING STUDENT CAN TAKE ASSESSMENT:');

  // Get the Quiz assessment
  const { data: quiz } = await supabase
    .from('assessments')
    .select('id, title, status, course_id')
    .eq('title', 'Quiz')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (quiz) {
    console.log('   Assessment:', quiz.title);
    console.log('   Status:', quiz.status);

    // Get a student
    const { data: student } = await supabase
      .from('students')
      .select('id, section_id')
      .eq('section_id', '1c4ca13d-cba8-4219-be47-61bb652c5d4a')
      .limit(1)
      .single();

    if (student) {
      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', student.id)
        .eq('course_id', quiz.course_id)
        .single();

      console.log('   Student enrolled:', enrollment ? 'YES' : 'NO');

      // Check existing submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('student_id', student.id)
        .eq('assessment_id', quiz.id);

      console.log('   Existing submissions:', submissions?.length || 0);
      submissions?.forEach(s => {
        console.log(`     - ${s.id} (${s.status})`);
      });
    }
  }
}

check();
