const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qyjzqzqqjimittltttph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o'
);

async function checkDashboardData() {
  console.log('\n=== CHECKING DASHBOARD DATA ===\n');

  // 1. Get student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('email', 'student@msu.edu.ph')
    .single();

  if (studentError) {
    console.error('❌ Student not found:', studentError);
    return;
  }

  console.log('✅ Student found:', student.full_name, '(ID:', student.id, ')');

  // 2. Check enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from('student_subjects')
    .select('*, subjects(*)')
    .eq('student_id', student.id);

  console.log('\n📚 ENROLLMENTS:', enrollments?.length || 0);
  if (enrollments && enrollments.length > 0) {
    enrollments.forEach(e => {
      console.log(`  - ${e.subjects?.code}: ${e.subjects?.name}`);
    });
  } else {
    console.log('  ⚠️  NO ENROLLMENTS - This is why dashboard is empty!');
  }

  // 3. Check total subjects available
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*');

  console.log('\n📖 TOTAL SUBJECTS IN DATABASE:', subjects?.length || 0);
  if (subjects && subjects.length > 0) {
    subjects.forEach(s => {
      console.log(`  - ${s.code}: ${s.name}`);
    });
  }

  // 4. Check assessments
  const { data: assessments } = await supabase
    .from('assessments')
    .select('*');

  console.log('\n📝 TOTAL ASSESSMENTS:', assessments?.length || 0);

  // 5. Check modules
  const { data: modules } = await supabase
    .from('modules')
    .select('*');

  console.log('\n📦 TOTAL MODULES:', modules?.length || 0);

  // 6. Check lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*');

  console.log('\n📄 TOTAL LESSONS:', lessons?.length || 0);

  // 7. Check student progress
  const { data: progress } = await supabase
    .from('student_lesson_progress')
    .select('*')
    .eq('student_id', student.id);

  console.log('\n📊 STUDENT PROGRESS RECORDS:', progress?.length || 0);

  // 8. Summary
  console.log('\n=== SUMMARY ===');
  console.log('Student exists:', student ? '✅' : '❌');
  console.log('Has enrollments:', enrollments?.length > 0 ? '✅' : '❌ THIS IS THE PROBLEM!');
  console.log('Subjects exist:', subjects?.length > 0 ? '✅' : '❌');
  console.log('Assessments exist:', assessments?.length > 0 ? '✅' : '❌');
  console.log('Modules exist:', modules?.length > 0 ? '✅' : '❌');
  console.log('Lessons exist:', lessons?.length > 0 ? '✅' : '❌');

  if (enrollments?.length === 0 && subjects?.length > 0) {
    console.log('\n⚠️  DIAGNOSIS: Student has NO enrollments!');
    console.log('   The SQL fixes likely deleted the student_subjects records.');
    console.log('   Dashboard is empty because there are no courses to show.');
    console.log('\n💡 FIX: Run a script to re-enroll the student in subjects.');
  }
}

checkDashboardData().catch(console.error);
