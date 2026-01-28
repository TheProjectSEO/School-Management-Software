/**
 * Simple seed script - creates accounts one at a time
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey);

async function createUser(email: string, password: string, fullName: string) {
  console.log(`\nCreating user: ${email}`);

  // Try to create user
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    if (error.message.includes('already')) {
      console.log('  User already exists, updating password...');
      // Get user by email using signIn to find the ID
      const { data: signInData } = await anonClient.auth.signInWithPassword({ email, password });
      if (signInData?.user) {
        await adminClient.auth.admin.updateUserById(signInData.user.id, { password });
        console.log('  Password verified/updated');
        return signInData.user.id;
      }
      // Try different password
      const testPasswords = ['Demo123!@#', 'password123', 'Password123!'];
      for (const pwd of testPasswords) {
        const { data: testData } = await anonClient.auth.signInWithPassword({ email, password: pwd });
        if (testData?.user) {
          console.log(`  Found user, updating password from ${pwd}`);
          await adminClient.auth.admin.updateUserById(testData.user.id, { password });
          return testData.user.id;
        }
      }
      console.log('  Could not find existing user');
      return null;
    }
    console.log('  Error:', error.message);
    return null;
  }

  console.log('  Created user:', data.user.id);
  return data.user.id;
}

async function main() {
  console.log('='.repeat(50));
  console.log('Simple Account Seeder');
  console.log('='.repeat(50));

  // Test connection
  const { data: testData, error: testError } = await adminClient.from('schools').select('count');
  if (testError) {
    console.log('Database connection test failed:', testError.message);
  } else {
    console.log('Database connection OK');
  }

  // Get or create school
  let { data: school } = await adminClient
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  if (!school) {
    console.log('\nCreating school...');
    const { data: newSchool, error } = await adminClient
      .from('schools')
      .insert({
        slug: 'msu-demo',
        name: 'MSU Demo School',
        region: 'Region X',
        division: 'Marawi City',
      })
      .select('id')
      .single();

    if (error) {
      console.log('Failed to create school:', error.message);
      return;
    }
    school = newSchool;
    console.log('Created school:', school.id);
  } else {
    console.log('\nSchool exists:', school.id);
  }

  // Get or create section
  let { data: section } = await adminClient
    .from('sections')
    .select('id')
    .eq('school_id', school.id)
    .eq('name', 'Grade 10-A')
    .single();

  if (!section) {
    console.log('Creating section...');
    const { data: newSection, error } = await adminClient
      .from('sections')
      .insert({
        school_id: school.id,
        name: 'Grade 10-A',
        grade_level: '10',
      })
      .select('id')
      .single();

    if (error) {
      console.log('Failed to create section:', error.message);
      return;
    }
    section = newSection;
    console.log('Created section:', section.id);
  } else {
    console.log('Section exists:', section.id);
  }

  // Create accounts
  const accounts = [
    { email: 'admin.demo@msu.edu.ph', password: 'Demo123!@#', name: 'Admin Demo', role: 'admin' },
    { email: 'teacher.demo@msu.edu.ph', password: 'Demo123!@#', name: 'Teacher Demo', role: 'teacher' },
    { email: 'student.demo@msu.edu.ph', password: 'Demo123!@#', name: 'Student Demo', role: 'student' },
  ];

  for (const acc of accounts) {
    const userId = await createUser(acc.email, acc.password, acc.name);
    if (!userId) continue;

    // Create school_profile
    const { data: profile } = await adminClient
      .from('school_profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    let profileId = profile?.id;
    if (!profileId) {
      console.log('  Creating school_profile...');
      const { data: newProfile, error } = await adminClient
        .from('school_profiles')
        .insert({ auth_user_id: userId, full_name: acc.name })
        .select('id')
        .single();

      if (error) {
        console.log('  Failed to create profile:', error.message);
        continue;
      }
      profileId = newProfile.id;
      console.log('  Created profile:', profileId);
    } else {
      console.log('  Profile exists:', profileId);
    }

    // Create role record
    if (acc.role === 'admin') {
      const { data: existing } = await adminClient
        .from('admins')
        .select('id')
        .or(`profile_id.eq.${userId},profile_id.eq.${profileId}`)
        .single();

      if (!existing) {
        const { error } = await adminClient.from('admins').insert({
          profile_id: userId, // admins use auth user id directly
          school_id: school.id,
          role: 'super_admin',
        });
        if (error) console.log('  Failed to create admin:', error.message);
        else console.log('  Created admin record');
      } else {
        console.log('  Admin record exists');
      }
    } else if (acc.role === 'teacher') {
      const { data: existing } = await adminClient
        .from('teachers')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (!existing) {
        const { error } = await adminClient.from('teachers').insert({
          profile_id: profileId,
          school_id: school.id,
          employee_id: 'EMP001',
        });
        if (error) console.log('  Failed to create teacher:', error.message);
        else console.log('  Created teacher record');
      } else {
        console.log('  Teacher record exists');
      }
    } else if (acc.role === 'student') {
      const { data: existing } = await adminClient
        .from('students')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (!existing) {
        const { error } = await adminClient.from('students').insert({
          profile_id: profileId,
          school_id: school.id,
          section_id: section.id,
          grade_level: '10',
          lrn: '123456789012',
          status: 'active',
        });
        if (error) console.log('  Failed to create student:', error.message);
        else console.log('  Created student record');
      } else {
        console.log('  Student record exists');
      }
    }
  }

  // Test logins
  console.log('\n' + '='.repeat(50));
  console.log('Testing Logins');
  console.log('='.repeat(50));

  for (const acc of accounts) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (error) {
      console.log(`${acc.email}: FAILED - ${error.message}`);
    } else {
      console.log(`${acc.email}: OK (${data.user.id})`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test Credentials:');
  console.log('='.repeat(50));
  console.log('ADMIN:   admin.demo@msu.edu.ph / Demo123!@#');
  console.log('TEACHER: teacher.demo@msu.edu.ph / Demo123!@#');
  console.log('STUDENT: student.demo@msu.edu.ph / Demo123!@#');
}

main().catch(console.error);
