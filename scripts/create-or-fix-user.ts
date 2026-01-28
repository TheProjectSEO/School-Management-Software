/**
 * Script to create or fix a user account with proper profile setup
 * Run with: npx tsx apps/web/scripts/create-or-fix-user.ts
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

// Configuration
const TARGET_EMAIL = 'mrdariusmaster@gmail.com';
const NEW_PASSWORD = 'demo123z@';
const FULL_NAME = 'Gabriel Ignacio';
const ROLE = 'teacher'; // 'teacher', 'student', or 'admin'
const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'; // Bulakan State University

async function main() {
  console.log('='.repeat(60));
  console.log('Create/Fix User Script');
  console.log('='.repeat(60));
  console.log(`Email: ${TARGET_EMAIL}`);
  console.log(`Password: ${NEW_PASSWORD}`);
  console.log(`Full Name: ${FULL_NAME}`);
  console.log(`Role: ${ROLE}`);
  console.log(`School ID: ${SCHOOL_ID}`);
  console.log('');

  // Step 1: Create or update auth user
  console.log('Step 1: Creating/updating auth user...');

  // First try to find existing user by searching with admin API
  // Since listUsers might fail, we'll try to create the user
  // If user exists with same email, it will fail with a specific error
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: TARGET_EMAIL,
    password: NEW_PASSWORD,
    email_confirm: true, // Auto-confirm email
  });

  let authUserId: string;

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('duplicate')) {
      console.log('  User already exists, attempting to update password...');

      // We need to find the user ID. Let's search through profiles table
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', TARGET_EMAIL)
        .single();

      if (existingProfile) {
        // The profiles.id is often the same as auth user id
        console.log(`  Found profile ID: ${existingProfile.id}`);

        // Try to update password using this ID
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingProfile.id, {
          password: NEW_PASSWORD
        });

        if (updateError) {
          console.log(`  Could not update password: ${updateError.message}`);
          console.log('  You may need to update the password manually in Supabase Dashboard');
        } else {
          console.log('  Password updated successfully!');
        }

        authUserId = existingProfile.id;
      } else {
        console.log('  ERROR: User exists but could not find profile');
        console.log('  Please update password manually in Supabase Dashboard');
        return;
      }
    } else {
      console.log(`  Error creating user: ${createError.message}`);
      return;
    }
  } else {
    authUserId = createData.user.id;
    console.log(`  Created new auth user: ${authUserId}`);
  }

  console.log(`  Auth User ID: ${authUserId}`);
  console.log('');

  // Step 2: Create or update school_profile
  console.log('Step 2: Creating/updating school_profile...');

  // Check if school_profile exists
  const { data: existingSchoolProfile } = await adminClient
    .from('school_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  let schoolProfileId: string;

  if (existingSchoolProfile) {
    console.log(`  School profile already exists: ${existingSchoolProfile.id}`);
    schoolProfileId = existingSchoolProfile.id;
  } else {
    // Create new school_profile
    const { data: newSchoolProfile, error: spError } = await adminClient
      .from('school_profiles')
      .insert({
        auth_user_id: authUserId,
        full_name: FULL_NAME,
      })
      .select()
      .single();

    if (spError) {
      console.log(`  Error creating school_profile: ${spError.message}`);
      return;
    }

    console.log(`  Created school_profile: ${newSchoolProfile.id}`);
    schoolProfileId = newSchoolProfile.id;
  }
  console.log('');

  // Step 3: Create role record
  console.log(`Step 3: Creating ${ROLE} record...`);

  if (ROLE === 'teacher') {
    // Check if teacher record exists
    const { data: existingTeacher } = await adminClient
      .from('teachers')
      .select('*')
      .eq('profile_id', schoolProfileId)
      .single();

    if (existingTeacher) {
      console.log(`  Teacher record already exists: ${existingTeacher.id}`);
    } else {
      const { data: newTeacher, error: tError } = await adminClient
        .from('teachers')
        .insert({
          profile_id: schoolProfileId,
          school_id: SCHOOL_ID,
        })
        .select()
        .single();

      if (tError) {
        console.log(`  Error creating teacher: ${tError.message}`);
        // Try teacher_profiles table instead
        console.log('  Trying teacher_profiles table...');
        const { data: newTP, error: tpError } = await adminClient
          .from('teacher_profiles')
          .insert({
            profile_id: schoolProfileId,
            school_id: SCHOOL_ID,
          })
          .select()
          .single();

        if (tpError) {
          console.log(`  Error creating teacher_profile: ${tpError.message}`);
        } else {
          console.log(`  Created teacher_profile: ${newTP.id}`);
        }
      } else {
        console.log(`  Created teacher: ${newTeacher.id}`);
      }
    }
  } else if (ROLE === 'student') {
    const { data: existingStudent } = await adminClient
      .from('students')
      .select('*')
      .eq('profile_id', schoolProfileId)
      .single();

    if (existingStudent) {
      console.log(`  Student record already exists: ${existingStudent.id}`);
    } else {
      const { data: newStudent, error: sError } = await adminClient
        .from('students')
        .insert({
          profile_id: schoolProfileId,
          school_id: SCHOOL_ID,
        })
        .select()
        .single();

      if (sError) {
        console.log(`  Error creating student: ${sError.message}`);
      } else {
        console.log(`  Created student: ${newStudent.id}`);
      }
    }
  } else if (ROLE === 'admin') {
    const { data: existingAdmin } = await adminClient
      .from('admins')
      .select('*')
      .eq('profile_id', schoolProfileId)
      .single();

    if (existingAdmin) {
      console.log(`  Admin record already exists: ${existingAdmin.id}`);
    } else {
      const { data: newAdmin, error: aError } = await adminClient
        .from('admins')
        .insert({
          profile_id: schoolProfileId,
          school_id: SCHOOL_ID,
        })
        .select()
        .single();

      if (aError) {
        console.log(`  Error creating admin: ${aError.message}`);
      } else {
        console.log(`  Created admin: ${newAdmin.id}`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Email: ${TARGET_EMAIL}`);
  console.log(`Password: ${NEW_PASSWORD}`);
  console.log(`Role: ${ROLE}`);
  console.log('');
  console.log('You should now be able to login!');
  console.log('='.repeat(60));
}

main().catch(console.error);
