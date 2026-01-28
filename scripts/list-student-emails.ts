import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function getStudentEmails() {
  const supabase = createAdminClient();
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== GRADE 12 STEM A - STUDENT EMAILS ===\n');

  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id, lrn')
    .eq('section_id', sectionId)
    .eq('status', 'active');

  console.log('Total students:', students?.length || 0);
  console.log('');

  const studentList: { name: string; email: string; lrn: string }[] = [];

  for (const s of students || []) {
    // Check school_profiles for student info
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', s.profile_id)
      .single();

    let email = 'N/A';
    if (sp?.auth_user_id) {
      // Get email from profiles table using auth_user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', sp.auth_user_id)
        .single();
      email = profile?.email || 'N/A';
    }

    studentList.push({
      name: sp?.full_name || 'N/A',
      email: email,
      lrn: s.lrn || 'N/A',
    });
  }

  // Sort by name
  studentList.sort((a, b) => a.name.localeCompare(b.name));

  // Print with emails
  console.log('Students with valid emails:\n');
  const withEmails = studentList.filter(s => s.email !== 'N/A');
  withEmails.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   Email: ${s.email}`);
    console.log(`   LRN: ${s.lrn}`);
    console.log('');
  });

  if (withEmails.length === 0) {
    console.log('No students with emails found.\n');
    console.log('Students without emails:');
    studentList.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (LRN: ${s.lrn})`);
    });
  }

  // Quick copy list
  console.log('\n=== QUICK COPY LIST ===\n');
  withEmails.slice(0, 5).forEach(s => {
    console.log(s.email);
  });
}

getStudentEmails();
