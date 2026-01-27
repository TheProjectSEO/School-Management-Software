import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function createTestAssessment() {
  const supabase = createAdminClient();
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const schoolId = '11111111-1111-1111-1111-111111111111';

  console.log('=== CREATING TEST ASSESSMENT ===\n');

  // 1. Get a course from Grade 12 STEM A
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', sectionId)
    .limit(1);

  if (!courses?.length) {
    console.log('❌ No courses found for section');
    return;
  }

  const course = courses[0];
  console.log('Using course:', course.name);
  console.log('Course ID:', course.id);
  console.log('Teacher ID:', course.teacher_id);

  // 2. Get a teacher profile for created_by
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .limit(1)
    .single();

  if (!teacher) {
    console.log('❌ No teacher found');
    return;
  }

  console.log('Teacher profile ID:', teacher.id);

  // 3. Create a published assessment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .insert({
      title: 'Test Quiz - Basic Concepts',
      type: 'quiz',
      course_id: course.id,
      section_id: sectionId,
      school_id: schoolId,
      instructions: 'This is a test quiz to verify student visibility. Answer all questions.',
      due_date: dueDate.toISOString(),
      time_limit_minutes: 30,
      max_attempts: 2,
      total_points: 50,
      status: 'published',  // PUBLISHED so students can see it
      created_by: teacher.id,
    })
    .select()
    .single();

  if (assessmentError) {
    console.log('❌ Error creating assessment:', assessmentError.message);
    return;
  }

  console.log('\n✅ Assessment created!');
  console.log('   ID:', assessment.id);
  console.log('   Title:', assessment.title);
  console.log('   Status:', assessment.status);
  console.log('   Due:', assessment.due_date);

  // 4. Create some test questions
  const questions = [
    {
      assessment_id: assessment.id,
      question_text: 'What is 2 + 2?',
      question_type: 'multiple_choice',
      choices_json: JSON.stringify(['3', '4', '5', '6']),
      answer_key_json: JSON.stringify({ correct: 1 }), // Index 1 = '4'
      points: 10,
      order_index: 0,
    },
    {
      assessment_id: assessment.id,
      question_text: 'The Earth is flat.',
      question_type: 'true_false',
      choices_json: JSON.stringify(['True', 'False']),
      answer_key_json: JSON.stringify({ correct: 1 }), // Index 1 = 'False'
      points: 10,
      order_index: 1,
    },
    {
      assessment_id: assessment.id,
      question_text: 'What is the capital of the Philippines?',
      question_type: 'multiple_choice',
      choices_json: JSON.stringify(['Cebu', 'Manila', 'Davao', 'Quezon City']),
      answer_key_json: JSON.stringify({ correct: 1 }), // Index 1 = 'Manila'
      points: 10,
      order_index: 2,
    },
    {
      assessment_id: assessment.id,
      question_text: 'Explain Newton\'s First Law of Motion in your own words.',
      question_type: 'essay',
      choices_json: null,
      answer_key_json: null,
      points: 20,
      order_index: 3,
    },
  ];

  const { data: insertedQuestions, error: questionsError } = await supabase
    .from('teacher_assessment_questions')
    .insert(questions)
    .select();

  if (questionsError) {
    console.log('❌ Error creating questions:', questionsError.message);
    // Try the other table
    const { data: altQuestions, error: altError } = await supabase
      .from('questions')
      .insert(questions.map(q => ({
        assessment_id: q.assessment_id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
      })))
      .select();

    if (altError) {
      console.log('❌ Error with questions table too:', altError.message);
    } else {
      console.log('✅ Questions created in "questions" table:', altQuestions?.length);
    }
  } else {
    console.log('✅ Questions created:', insertedQuestions?.length);
  }

  // 5. Verify student can see it
  console.log('\n=== VERIFICATION ===\n');

  // Get a student from the section
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .limit(1);

  if (!students?.length) {
    console.log('❌ No students found');
    return;
  }

  const studentId = students[0].id;

  // Get their enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId);

  const courseIds = enrollments?.map(e => e.course_id) || [];

  // Query assessments like the student DAL does (with status='published')
  const { data: visibleAssessments } = await supabase
    .from('assessments')
    .select('id, title, status, due_date')
    .in('course_id', courseIds)
    .eq('status', 'published')
    .gte('due_date', new Date().toISOString());

  console.log('Student can see', visibleAssessments?.length || 0, 'published assessments:');
  visibleAssessments?.forEach(a => {
    console.log(`  ✅ ${a.title} (due: ${new Date(a.due_date).toLocaleDateString()})`);
  });

  console.log('\n=== TEST COMPLETE ===\n');
}

createTestAssessment();
