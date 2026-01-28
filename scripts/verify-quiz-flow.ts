import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function verify() {
  const supabase = createAdminClient();

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  console.log('=== VERIFYING QUIZ FLOW ===\n');

  // 1. Check assessment
  const { data: assessment, error: asmError } = await supabase
    .from('assessments')
    .select('id, title, status, total_points, course_id')
    .eq('id', assessmentId)
    .single();

  if (asmError || !assessment) {
    console.log('❌ Assessment not found:', asmError?.message);
    return;
  }

  console.log('1. Assessment:');
  console.log('   Title:', assessment.title);
  console.log('   Status:', assessment.status);
  console.log('   Total Points:', assessment.total_points);
  console.log('   Course ID:', assessment.course_id);

  // 2. Check questions
  const { data: questions, error: qError } = await supabase
    .from('teacher_assessment_questions')
    .select('id, question_text, question_type, choices_json, answer_key_json, points')
    .eq('assessment_id', assessmentId)
    .order('order_index');

  if (qError) {
    console.log('❌ Error fetching questions:', qError.message);
    return;
  }

  console.log('\n2. Questions:', questions?.length || 0);
  questions?.forEach((q, i) => {
    console.log(`\n   Q${i + 1}: ${q.question_text}`);
    console.log(`       Type: ${q.question_type}`);
    console.log(`       Points: ${q.points}`);
    console.log(`       Choices: ${JSON.stringify(q.choices_json)}`);
    console.log(`       Answer Key: ${JSON.stringify(q.answer_key_json)}`);
  });

  // 3. Check student enrollments
  const { data: enrollments, error: eError } = await supabase
    .from('student_course_enrollments')
    .select(`
      student:student_profiles(
        id,
        profile:school_profiles(full_name)
      )
    `)
    .eq('course_id', assessment.course_id)
    .limit(5);

  console.log('\n3. Enrolled Students:');
  if (eError) {
    console.log('   ❌ Error:', eError.message);
  } else {
    enrollments?.forEach((e: any) => {
      console.log(`   - ${e.student?.profile?.full_name} (${e.student?.id})`);
    });
  }

  // 4. Summary
  console.log('\n=== SUMMARY ===');
  if (assessment.status === 'published' && (questions?.length || 0) > 0) {
    console.log('✅ Quiz is ready for students!');
    console.log(`   - Assessment is published`);
    console.log(`   - Has ${questions?.length} questions`);
    console.log(`   - Total ${assessment.total_points} points`);
    console.log('\nStudents can now:');
    console.log('1. Go to their dashboard');
    console.log('2. Click on Assessments');
    console.log('3. Find and open the quiz');
    console.log('4. Take the quiz and submit');
  } else {
    if (assessment.status !== 'published') {
      console.log('⚠️ Assessment is not published');
    }
    if (!questions || questions.length === 0) {
      console.log('⚠️ No questions found');
    }
  }

  console.log('\n=== DATABASE CONSTRAINT FIX REQUIRED ===');
  console.log('\nTo allow teachers to create multiple_choice questions via UI:');
  console.log('Run this SQL in Supabase SQL Editor:\n');
  console.log(`ALTER TABLE teacher_assessment_questions
DROP CONSTRAINT IF EXISTS teacher_assessment_questions_question_type_check;

ALTER TABLE teacher_assessment_questions
ADD CONSTRAINT teacher_assessment_questions_question_type_check
CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_blank', 'matching'));`);
  console.log('\nDashboard URL: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new');
}

verify();
