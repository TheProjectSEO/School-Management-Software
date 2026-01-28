import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function cleanup() {
  const supabase = createAdminClient();

  const msuId = '11111111-1111-1111-1111-111111111111';
  const correctSectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a'; // The one with students

  console.log('=== FINDING DUPLICATE GRADE 12 - STEM A SECTIONS ===\n');

  // Find all Grade 12 - STEM A sections
  const { data: stemSections } = await supabase
    .from('sections')
    .select('id, name, grade_level, school_id')
    .ilike('name', '%12%STEM%A%');

  console.log('Found sections matching "Grade 12 - STEM A":');

  const toDelete: string[] = [];

  for (const section of stemSections || []) {
    // Count students in this section
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', section.id);

    const studentCount = count || 0;
    const isKeep = section.id === correctSectionId;

    console.log(`\n  ${section.name}`);
    console.log(`  ID: ${section.id}`);
    console.log(`  Students: ${studentCount}`);
    console.log(`  Action: ${isKeep ? '✅ KEEP (has students)' : '🗑️ DELETE (duplicate)'}`);

    if (!isKeep && studentCount === 0) {
      toDelete.push(section.id);
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    console.log('\n=== DELETING DUPLICATES ===\n');

    for (const id of toDelete) {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) {
        console.log(`❌ Error deleting ${id}:`, error.message);
      } else {
        console.log(`✅ Deleted section: ${id}`);
      }
    }
  } else {
    console.log('\nNo duplicates to delete.');
  }

  // List all users with emails
  console.log('\n=== ALL USERS WITH EMAILS ===\n');

  // Get auth users
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });

  const authUsers = authData?.users || [];

  // Create a map of auth_user_id to email
  const emailMap = new Map<string, string>();
  authUsers.forEach(u => {
    emailMap.set(u.id, u.email || 'No email');
  });

  // Get all school_profiles with auth_user_id
  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id')
    .eq('school_id', msuId)
    .not('auth_user_id', 'is', null);

  // Students
  console.log('📚 STUDENTS:');
  console.log('─'.repeat(60));

  const { data: students } = await supabase
    .from('students')
    .select('id, profile_id')
    .eq('school_id', msuId);

  for (const student of students || []) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', student.profile_id)
      .single();

    if (profile) {
      const email = profile.auth_user_id ? emailMap.get(profile.auth_user_id) : null;

      // If no email in auth, check profiles table
      let finalEmail = email;
      if (!finalEmail && profile.auth_user_id) {
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profile.auth_user_id)
          .single();
        finalEmail = authProfile?.email;
      }

      console.log(`  ${profile.full_name}`);
      console.log(`  Email: ${finalEmail || 'Not set'}`);
      console.log(`  Password: Student123!`);
      console.log('');
    }
  }

  // Teachers
  console.log('\n👨‍🏫 TEACHERS:');
  console.log('─'.repeat(60));

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id')
    .eq('school_id', msuId);

  for (const teacher of teachers || []) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', teacher.profile_id)
      .single();

    if (profile) {
      const email = profile.auth_user_id ? emailMap.get(profile.auth_user_id) : null;

      let finalEmail = email;
      if (!finalEmail && profile.auth_user_id) {
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profile.auth_user_id)
          .single();
        finalEmail = authProfile?.email;
      }

      console.log(`  ${profile.full_name}`);
      console.log(`  Email: ${finalEmail || 'Not set'}`);
      console.log('');
    }
  }

  // Admins
  console.log('\n🔐 ADMINS:');
  console.log('─'.repeat(60));

  const { data: admins } = await supabase
    .from('admins')
    .select('id, profile_id, school_id')
    .eq('school_id', msuId);

  for (const admin of admins || []) {
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name, auth_user_id')
      .eq('id', admin.profile_id)
      .single();

    if (profile) {
      const email = profile.auth_user_id ? emailMap.get(profile.auth_user_id) : null;

      let finalEmail = email;
      if (!finalEmail && profile.auth_user_id) {
        const { data: authProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profile.auth_user_id)
          .single();
        finalEmail = authProfile?.email;
      }

      console.log(`  ${profile.full_name}`);
      console.log(`  Email: ${finalEmail || 'Not set'}`);
      console.log('');
    }
  }
}

cleanup();
