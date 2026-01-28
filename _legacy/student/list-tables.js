const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qyjzqzqqjimittltttph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o'
);

async function listTables() {
  console.log('\n=== ATTEMPTING TO QUERY DIFFERENT TABLES ===\n');

  const tablesToTry = [
    'students',
    'student_profiles',
    'profiles',
    'users',
    'student_subjects',
    'subjects',
    'student_notes',
    'assessments',
    'modules',
    'lessons'
  ];

  for (const table of tablesToTry) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: Table exists (${data?.length || 0} rows found in sample)`);
    }
  }

  // Try to get auth user
  console.log('\n=== CHECKING AUTH ===');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('❌ Cannot list auth users (need service role key)');
  } else {
    console.log(`✅ Auth users: ${users?.length || 0}`);
  }
}

listTables().catch(console.error);
