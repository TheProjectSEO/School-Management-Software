const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qyjzqzqqjimittltttph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o'
);

async function checkProfiles() {
  console.log('\n=== CHECKING PROFILES TABLE ===\n');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total profiles:', profiles?.length || 0);
  console.log('\nProfile data:');
  console.log(JSON.stringify(profiles, null, 2));

  // Check users table
  console.log('\n=== CHECKING USERS TABLE ===\n');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');

  if (usersError) {
    console.error('Error:', usersError);
  } else {
    console.log('Total users:', users?.length || 0);
    console.log('\nUser data:');
    console.log(JSON.stringify(users, null, 2));
  }

  // Check student_notes table
  console.log('\n=== CHECKING STUDENT_NOTES TABLE ===\n');
  const { data: notes, error: notesError } = await supabase
    .from('student_notes')
    .select('*');

  if (notesError) {
    console.error('Error:', notesError);
  } else {
    console.log('Total notes:', notes?.length || 0);
  }
}

checkProfiles().catch(console.error);
