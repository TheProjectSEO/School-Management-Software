/**
 * Create test accounts from scratch
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('Creating test accounts...\n');

  // List existing users
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  console.log('Existing users:', existingUsers?.users?.length || 0);
  existingUsers?.users?.forEach(u => {
    console.log(`  - ${u.email} (${u.id})`);
  });

  // Get or create school
  let { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  if (!school) {
    const { data: newSchool, error } = await supabase
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
      console.error('Failed to create school:', error);
      return;
    }
    school = newSchool;
  }
  console.log('\nSchool ID:', school.id);

  // Get or create section
  let { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', school.id)
    .single();

  if (!section) {
    const { data: newSection, error } = await supabase
      .from('sections')
      .insert({
        school_id: school.id,
        name: 'Grade 10-A',
        grade_level: '10',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create section:', error);
      return;
    }
    section = newSection;
  }
  console.log('Section ID:', section.id);

  const accounts = [
    { email: 'admin.demo@msu.edu.ph', password: 'Demo123!@#', fullName: 'Admin Demo', role: 'admin' },
    { email: 'teacher.demo@msu.edu.ph', password: 'Demo123!@#', fullName: 'Teacher Demo', role: 'teacher' },
    { email: 'student.demo@msu.edu.ph', password: 'Demo123!@#', fullName: 'Student Demo', role: 'student' },
  ];

  for (const account of accounts) {
    console.log(`\n--- Creating ${account.role}: ${account.email} ---`);

    // Check if user exists
    let userId: string;
    const existingUser = existingUsers?.users?.find(u => u.email === account.email);

    if (existingUser) {
      userId = existingUser.id;
      console.log('  User exists:', userId);

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: account.password,
      });
      if (updateError) {
        console.log('  Failed to update password:', updateError.message);
      } else {
        console.log('  Password updated');
      }
    } else {
      // Create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName, role: account.role },
      });

      if (createError) {
        console.log('  Failed to create user:', createError.message);
        continue;
      }

      userId = newUser.user.id;
      console.log('  Created user:', userId);
    }

    // Create school_profile
    let { data: profile } = await supabase
      .from('school_profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (!profile) {
      const { data: newProfile, error: profileError } = await supabase
        .from('school_profiles')
        .insert({
          auth_user_id: userId,
          full_name: account.fullName,
        })
        .select('id')
        .single();

      if (profileError) {
        console.log('  Failed to create profile:', profileError.message);
        continue;
      }
      profile = newProfile;
      console.log('  Created profile:', profile.id);
    } else {
      console.log('  Profile exists:', profile.id);
    }

    // Create role record
    if (account.role === 'admin') {
      const { data: existing } = await supabase
        .from('admins')
        .select('id')
        .eq('profile_id', userId)
        .single();

      if (!existing) {
        const { error } = await supabase.from('admins').insert({
          profile_id: userId,
          school_id: school.id,
          role: 'super_admin',
        });
        if (error) {
          console.log('  Failed to create admin record:', error.message);
        } else {
          console.log('  Created admin record');
        }
      } else {
        console.log('  Admin record exists');
      }
    } else if (account.role === 'teacher') {
      const { data: existing } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!existing) {
        const { error } = await supabase.from('teachers').insert({
          profile_id: profile.id,
          school_id: school.id,
          employee_id: 'EMP001',
        });
        if (error) {
          console.log('  Failed to create teacher record:', error.message);
        } else {
          console.log('  Created teacher record');
        }
      } else {
        console.log('  Teacher record exists');
      }
    } else if (account.role === 'student') {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!existing) {
        const { error } = await supabase.from('students').insert({
          profile_id: profile.id,
          school_id: school.id,
          section_id: section.id,
          grade_level: '10',
          lrn: '123456789012',
          status: 'active',
        });
        if (error) {
          console.log('  Failed to create student record:', error.message);
        } else {
          console.log('  Created student record');
        }
      } else {
        console.log('  Student record exists');
      }
    }
  }

  // Test logins
  console.log('\n--- Testing Logins ---');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  for (const account of accounts) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (error) {
      console.log(`${account.email}: ❌ ${error.message}`);
    } else {
      console.log(`${account.email}: ✅ Login OK (${data.user.id})`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test Credentials:');
  console.log('ADMIN:   admin.demo@msu.edu.ph / Demo123!@#');
  console.log('TEACHER: teacher.demo@msu.edu.ph / Demo123!@#');
  console.log('STUDENT: student.demo@msu.edu.ph / Demo123!@#');
  console.log('='.repeat(50));
}

main().catch(console.error);
