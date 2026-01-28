/**
 * Script to check database schema
 * Run with: npx tsx apps/web/scripts/check-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from apps/web/.env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('='.repeat(60));
  console.log('Schema Check Script');
  console.log('='.repeat(60));
  console.log('');

  // Check school_profiles table
  console.log('1. Checking school_profiles table...');
  const { data: profileSample, error: profileError } = await adminClient
    .from('school_profiles')
    .select('*')
    .limit(1);

  if (profileError) {
    console.log('  Error:', profileError.message);
  } else if (profileSample && profileSample.length > 0) {
    console.log('  Columns:', Object.keys(profileSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check teachers table
  console.log('2. Checking teachers table...');
  const { data: teacherSample, error: teacherError } = await adminClient
    .from('teachers')
    .select('*')
    .limit(1);

  if (teacherError) {
    console.log('  Error:', teacherError.message);
  } else if (teacherSample && teacherSample.length > 0) {
    console.log('  Columns:', Object.keys(teacherSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check students table
  console.log('3. Checking students table...');
  const { data: studentSample, error: studentError } = await adminClient
    .from('students')
    .select('*')
    .limit(1);

  if (studentError) {
    console.log('  Error:', studentError.message);
  } else if (studentSample && studentSample.length > 0) {
    console.log('  Columns:', Object.keys(studentSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check admins table
  console.log('4. Checking admins table...');
  const { data: adminSample, error: adminError } = await adminClient
    .from('admins')
    .select('*')
    .limit(1);

  if (adminError) {
    console.log('  Error:', adminError.message);
  } else if (adminSample && adminSample.length > 0) {
    console.log('  Columns:', Object.keys(adminSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check teacher_profiles table (alternative name)
  console.log('5. Checking teacher_profiles table...');
  const { data: tpSample, error: tpError } = await adminClient
    .from('teacher_profiles')
    .select('*')
    .limit(1);

  if (tpError) {
    console.log('  Error:', tpError.message);
  } else if (tpSample && tpSample.length > 0) {
    console.log('  Columns:', Object.keys(tpSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check student_profiles table (alternative name)
  console.log('6. Checking student_profiles table...');
  const { data: spSample, error: spError } = await adminClient
    .from('student_profiles')
    .select('*')
    .limit(1);

  if (spError) {
    console.log('  Error:', spError.message);
  } else if (spSample && spSample.length > 0) {
    console.log('  Columns:', Object.keys(spSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // Check profiles table (generic)
  console.log('7. Checking profiles table...');
  const { data: pSample, error: pError } = await adminClient
    .from('profiles')
    .select('*')
    .limit(1);

  if (pError) {
    console.log('  Error:', pError.message);
  } else if (pSample && pSample.length > 0) {
    console.log('  Columns:', Object.keys(pSample[0]).join(', '));
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  // List all schools
  console.log('8. Checking schools table...');
  const { data: schools, error: schoolError } = await adminClient
    .from('schools')
    .select('*')
    .limit(5);

  if (schoolError) {
    console.log('  Error:', schoolError.message);
  } else if (schools && schools.length > 0) {
    console.log('  Columns:', Object.keys(schools[0]).join(', '));
    console.log('  Sample schools:');
    schools.forEach(s => {
      console.log(`    - ${(s as any).name || (s as any).school_name || JSON.stringify(s)}`);
    });
  } else {
    console.log('  Table is empty');
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('Done!');
  console.log('='.repeat(60));
}

main().catch(console.error);
