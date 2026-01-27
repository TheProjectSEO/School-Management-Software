import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== ASSESSMENT DETAILS ===\n');

  // Get the Quiz assessment
  const { data: quiz } = await supabase
    .from('assessments')
    .select('*')
    .eq('title', 'Quiz')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (quiz) {
    console.log('Title:', quiz.title);
    console.log('Status:', quiz.status);
    console.log('Course ID:', quiz.course_id);
    console.log('Due Date:', quiz.due_date);
    console.log('Created At:', quiz.created_at);

    const now = new Date().toISOString();
    const dueDate = quiz.due_date;

    console.log('\nCurrent Time:', now);
    console.log('Due Date:', dueDate);

    if (dueDate && dueDate < now) {
      console.log('\n❌ PROBLEM: Due date has PASSED!');
      console.log('   The assessment won\'t show in "upcoming" assessments.');
      console.log('   Fix: Update due_date to a future date.');
    } else if (!dueDate) {
      console.log('\n❌ PROBLEM: No due date set!');
    } else {
      console.log('\n✅ Due date is in the future');
    }

    // Check the course
    const { data: course } = await supabase
      .from('courses')
      .select('id, name, section_id')
      .eq('id', quiz.course_id)
      .single();

    console.log('\nCourse:', course?.name);
    console.log('Section ID:', course?.section_id);

    // Check if it's the right section
    if (course?.section_id === '1c4ca13d-cba8-4219-be47-61bb652c5d4a') {
      console.log('Section: ✅ Grade 12 - STEM A');
    } else {
      console.log('Section: ❌ NOT Grade 12 - STEM A');
    }
  } else {
    console.log('Quiz not found');
  }

  // Also show all assessments with their due dates
  console.log('\n=== ALL PUBLISHED ASSESSMENTS ===\n');

  const { data: allPublished } = await supabase
    .from('assessments')
    .select('title, due_date, course_id, status')
    .eq('status', 'published');

  const now = new Date().toISOString();

  allPublished?.forEach(a => {
    const isUpcoming = a.due_date && a.due_date >= now;
    const icon = isUpcoming ? '✅' : '❌';
    console.log(`${icon} ${a.title}`);
    console.log(`   Due: ${a.due_date || 'Not set'}`);
    console.log(`   ${isUpcoming ? 'UPCOMING' : 'PAST DUE'}`);
  });
}

check();
