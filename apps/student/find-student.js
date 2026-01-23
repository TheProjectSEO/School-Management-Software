const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qyjzqzqqjimittltttph.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o'
);

async function findStudent() {
  console.log('\n=== SEARCHING FOR student@msu.edu.ph ===\n');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'student@msu.edu.ph');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (profiles && profiles.length > 0) {
    console.log('✅ FOUND STUDENT:', JSON.stringify(profiles[0], null, 2));
  } else {
    console.log('❌ NO STUDENT FOUND WITH EMAIL student@msu.edu.ph');
    console.log('\n=== ALL PROFILES IN DATABASE ===\n');

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    allProfiles?.forEach(p => {
      console.log(`- ${p.email} (${p.full_name})`);
    });
  }
}

findStudent().catch(console.error);
