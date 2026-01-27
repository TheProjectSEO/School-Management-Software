/**
 * Diagnose login issue for mrdariusmaster@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'mrdariusmaster@gmail.com';
const PASSWORD = 'demo123z@';

async function main() {
  console.log('='.repeat(60));
  console.log('LOGIN DIAGNOSIS');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Sign in to get the actual auth user ID
  console.log('Step 1: Signing in...');
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError || !authData.user) {
    console.log('  ERROR: Cannot sign in:', authError?.message);
    return;
  }

  const userId = authData.user.id;
  console.log('  Auth User ID:', userId);
  console.log('  Email:', authData.user.email);
  await anonClient.auth.signOut();
  console.log('');

  // Step 2: Check school_profiles for this auth_user_id
  console.log('Step 2: Checking school_profiles.auth_user_id =', userId);
  const { data: schoolProfile, error: spError } = await adminClient
    .from('school_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (spError || !schoolProfile) {
    console.log('  ERROR: No school_profile found!');
    console.log('  Error:', spError?.message);
    console.log('');
    console.log('  This is why login fails. Need to create/link school_profile.');

    // Check if there's any school_profile that might be for this user
    console.log('');
    console.log('  Looking for potential orphan profiles...');
    const { data: allProfiles } = await adminClient
      .from('school_profiles')
      .select('id, full_name, auth_user_id')
      .limit(30);

    console.log('  All school_profiles:');
    allProfiles?.forEach(p => {
      console.log(`    ${p.id}: ${p.full_name} (auth: ${p.auth_user_id || 'NULL'})`);
    });

    // FIX: Create school_profile
    console.log('');
    console.log('FIXING: Creating school_profile...');
    const { data: newProfile, error: createError } = await adminClient
      .from('school_profiles')
      .insert({
        auth_user_id: userId,
        full_name: 'Gabriel Ignacio',
      })
      .select()
      .single();

    if (createError) {
      console.log('  Error creating profile:', createError.message);
      return;
    }
    console.log('  Created school_profile:', newProfile.id);

    // Create student record
    console.log('FIXING: Creating student record...');
    const { data: newStudent, error: studentError } = await adminClient
      .from('students')
      .insert({
        profile_id: newProfile.id,
        school_id: '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
        status: 'active',
      })
      .select()
      .single();

    if (studentError) {
      console.log('  Error creating student:', studentError.message);
    } else {
      console.log('  Created student:', newStudent.id);
    }

    console.log('');
    console.log('FIXED! Try logging in again.');
    return;
  }

  console.log('  Found school_profile:');
  console.log('    ID:', schoolProfile.id);
  console.log('    Full Name:', schoolProfile.full_name);
  console.log('    Auth User ID:', schoolProfile.auth_user_id);
  console.log('');

  // Step 3: Check role tables
  console.log('Step 3: Checking role tables for profile_id =', schoolProfile.id);

  // Check admins
  const { data: admin } = await adminClient
    .from('admins')
    .select('*')
    .eq('profile_id', schoolProfile.id)
    .single();

  if (admin) {
    console.log('  Found in ADMINS:', admin.id);
  }

  // Check teachers
  const { data: teacher } = await adminClient
    .from('teachers')
    .select('*')
    .eq('profile_id', schoolProfile.id)
    .single();

  if (teacher) {
    console.log('  Found in TEACHERS:', teacher.id);
  }

  // Check students
  const { data: student } = await adminClient
    .from('students')
    .select('*')
    .eq('profile_id', schoolProfile.id)
    .single();

  if (student) {
    console.log('  Found in STUDENTS:', student.id);
  }

  if (!admin && !teacher && !student) {
    console.log('  ERROR: Not found in any role table!');
    console.log('');
    console.log('FIXING: Creating student record...');

    const { data: newStudent, error: studentError } = await adminClient
      .from('students')
      .insert({
        profile_id: schoolProfile.id,
        school_id: '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd',
        status: 'active',
      })
      .select()
      .single();

    if (studentError) {
      console.log('  Error:', studentError.message);
    } else {
      console.log('  Created student:', newStudent.id);
      console.log('');
      console.log('FIXED! Try logging in again.');
    }
  } else {
    console.log('');
    console.log('Role configuration looks correct. Login should work.');
  }

  console.log('');
  console.log('='.repeat(60));
}

main().catch(console.error);
