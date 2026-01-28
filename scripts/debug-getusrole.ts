/**
 * Debug getUserRole exactly as the login does
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'mrdariusmaster@gmail.com';
const PASSWORD = 'demo123z@';

async function main() {
  console.log('='.repeat(60));
  console.log('DEBUG getUserRole');
  console.log('='.repeat(60));

  // Sign in to get userId
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: authData } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (!authData?.user) {
    console.log('Cannot sign in');
    return;
  }

  const userId = authData.user.id;
  console.log('userId:', userId);
  await anonClient.auth.signOut();

  // Exactly replicate getUserRole
  console.log('\n--- Replicating getUserRole ---\n');

  // Step 1: Find school_profile
  console.log('1. Query: school_profiles WHERE auth_user_id =', userId);
  const { data: schoolProfile, error: spError } = await supabase
    .from('school_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  console.log('   Result:', schoolProfile);
  console.log('   Error:', spError?.message || 'none');

  const profileId = schoolProfile?.id;
  console.log('   profileId:', profileId);

  if (!profileId) {
    console.log('\n>>> FAIL: No school_profile found. getUserRole returns null.');
    return;
  }

  // Step 2: Check admins with userId
  console.log('\n2. Query: admins WHERE profile_id =', userId);
  const { data: adminByUserId, error: adminErr1 } = await supabase
    .from('admins')
    .select('id, school_id')
    .eq('profile_id', userId)
    .single();
  console.log('   Result:', adminByUserId);
  console.log('   Error:', adminErr1?.message || 'none');

  // Step 3: Check admins with profileId
  console.log('\n3. Query: admins WHERE profile_id =', profileId);
  const { data: adminByProfileId, error: adminErr2 } = await supabase
    .from('admins')
    .select('id, school_id')
    .eq('profile_id', profileId)
    .single();
  console.log('   Result:', adminByProfileId);
  console.log('   Error:', adminErr2?.message || 'none');

  if (adminByUserId || adminByProfileId) {
    console.log('\n>>> SUCCESS: Found admin role');
    return;
  }

  // Step 4: Check teachers
  console.log('\n4. Query: teachers WHERE profile_id =', profileId);
  const { data: teacher, error: teacherErr } = await supabase
    .from('teachers')
    .select('id, school_id')
    .eq('profile_id', profileId)
    .single();
  console.log('   Result:', teacher);
  console.log('   Error:', teacherErr?.message || 'none');

  if (teacher) {
    console.log('\n>>> SUCCESS: Found teacher role');
    return;
  }

  // Step 5: Check students
  console.log('\n5. Query: students WHERE profile_id =', profileId);
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, school_id')
    .eq('profile_id', profileId)
    .single();
  console.log('   Result:', student);
  console.log('   Error:', studentErr?.message || 'none');

  if (student) {
    console.log('\n>>> SUCCESS: Found student role');
    return;
  }

  console.log('\n>>> FAIL: No role found in admins, teachers, or students');

  // List all students to see what's there
  console.log('\n--- All students with this school_id ---');
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, profile_id, school_id')
    .eq('school_id', '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd')
    .limit(10);

  allStudents?.forEach(s => {
    const match = s.profile_id === profileId ? ' <<< MATCH' : '';
    console.log(`  ${s.id}: profile_id=${s.profile_id}${match}`);
  });
}

main().catch(console.error);
