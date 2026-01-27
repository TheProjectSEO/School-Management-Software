/**
 * Script to fix user role from teacher to student
 * Run with: npx tsx apps/web/scripts/fix-role.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCHOOL_PROFILE_ID = '370843c8-c593-42c0-8676-410b999e7769';
const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

async function main() {
  console.log('Fixing role: teacher -> student');
  console.log('');

  // First check existing students to see valid values
  console.log('Checking existing students for valid field values...');
  const { data: existingStudents } = await adminClient
    .from('students')
    .select('*')
    .limit(2);

  if (existingStudents && existingStudents.length > 0) {
    console.log('Sample student:', JSON.stringify(existingStudents[0], null, 2));
  }
  console.log('');

  // Step 1: Delete the teacher record (if any remaining)
  console.log('Step 1: Deleting any teacher record...');
  const { error: deleteError } = await adminClient
    .from('teachers')
    .delete()
    .eq('profile_id', SCHOOL_PROFILE_ID);

  if (deleteError) {
    console.log(`  Note: ${deleteError.message}`);
  } else {
    console.log('  Done');
  }

  // Step 2: Create student record with minimal required fields
  console.log('Step 2: Creating student record...');
  const { data: student, error: studentError } = await adminClient
    .from('students')
    .insert({
      profile_id: SCHOOL_PROFILE_ID,
      school_id: SCHOOL_ID,
    })
    .select()
    .single();

  if (studentError) {
    console.log(`  Error: ${studentError.message}`);

    // Try without school_id
    console.log('  Trying alternative insert...');
    const { data: student2, error: studentError2 } = await adminClient
      .from('students')
      .upsert({
        profile_id: SCHOOL_PROFILE_ID,
        school_id: SCHOOL_ID,
        status: 'active',
      })
      .select()
      .single();

    if (studentError2) {
      console.log(`  Error: ${studentError2.message}`);
    } else {
      console.log(`  Created student: ${student2.id}`);
    }
  } else {
    console.log(`  Created student: ${student.id}`);
  }

  // Verify
  console.log('');
  console.log('Verifying...');
  const { data: checkStudent } = await adminClient
    .from('students')
    .select('*')
    .eq('profile_id', SCHOOL_PROFILE_ID)
    .single();

  if (checkStudent) {
    console.log('Student record exists:', checkStudent.id);
  } else {
    console.log('No student record found');
  }

  console.log('');
  console.log('Done!');
  console.log('Email: mrdariusmaster@gmail.com');
  console.log('Password: demo123z@');
  console.log('Role: STUDENT');
}

main().catch(console.error);
