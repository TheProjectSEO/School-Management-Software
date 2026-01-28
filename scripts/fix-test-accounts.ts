/**
 * Fix Test Accounts Script
 *
 * Ensures test accounts are properly linked with school_profiles and role records
 * Run with: npx tsx scripts/fix-test-accounts.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestAccount {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'student';
  metadata?: Record<string, unknown>;
}

const testAccounts: TestAccount[] = [
  {
    email: 'admin.demo@msu.edu.ph',
    password: 'Demo123!@#',
    fullName: 'Admin Demo',
    role: 'admin',
  },
  {
    email: 'teacher.demo@msu.edu.ph',
    password: 'Demo123!@#',
    fullName: 'Teacher Demo',
    role: 'teacher',
    metadata: { employee_id: 'EMP001', department: 'Science' },
  },
  {
    email: 'student.demo@msu.edu.ph',
    password: 'Demo123!@#',
    fullName: 'Student Demo',
    role: 'student',
    metadata: { grade_level: '10', lrn: '123456789012' },
  },
];

async function getOrCreateSchool(): Promise<string> {
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  if (existingSchool) {
    return existingSchool.id;
  }

  const { data: newSchool, error } = await supabase
    .from('schools')
    .insert({
      slug: 'msu-demo',
      name: 'MSU Demo School',
      region: 'Region X',
      division: 'Marawi City',
      accent_color: '#7B1113',
    })
    .select('id')
    .single();

  if (error) throw error;
  return newSchool.id;
}

async function getOrCreateSection(schoolId: string): Promise<string> {
  const { data: existingSection } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', 'Grade 10-A')
    .single();

  if (existingSection) {
    return existingSection.id;
  }

  const { data: newSection, error } = await supabase
    .from('sections')
    .insert({
      school_id: schoolId,
      name: 'Grade 10-A',
      grade_level: '10',
    })
    .select('id')
    .single();

  if (error) throw error;
  return newSection.id;
}

async function fixAccount(account: TestAccount, schoolId: string, sectionId: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Fixing ${account.role}: ${account.email}`);
  console.log('='.repeat(50));

  // Get or create auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let authUser = existingUsers?.users?.find(u => u.email === account.email);

  if (!authUser) {
    console.log('Creating auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
      },
    });
    if (error) {
      console.error('Failed to create auth user:', error.message);
      return;
    }
    authUser = data.user;
    console.log('✅ Created auth user:', authUser.id);
  } else {
    console.log('Auth user exists:', authUser.id);
    // Update password
    await supabase.auth.admin.updateUserById(authUser.id, { password: account.password });
    console.log('✅ Password updated');
  }

  const userId = authUser.id;

  // Check school_profiles
  const { data: existingProfile } = await supabase
    .from('school_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  let profileId: string;

  if (existingProfile) {
    profileId = existingProfile.id;
    console.log('School profile exists:', profileId);
  } else {
    console.log('Creating school_profile...');
    const { data: newProfile, error } = await supabase
      .from('school_profiles')
      .insert({
        auth_user_id: userId,
        full_name: account.fullName,
        phone: '+639123456789',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create school_profile:', error.message);
      return;
    }
    profileId = newProfile.id;
    console.log('✅ Created school_profile:', profileId);
  }

  // Create role-specific record
  if (account.role === 'admin') {
    // Check both by userId and profileId
    const { data: existingAdminByUserId } = await supabase
      .from('admins')
      .select('id')
      .eq('profile_id', userId)
      .single();

    const { data: existingAdminByProfileId } = await supabase
      .from('admins')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existingAdminByUserId || existingAdminByProfileId) {
      console.log('✅ Admin record exists');
    } else {
      console.log('Creating admin record...');
      // Try with userId first (some schemas use auth.users.id directly)
      const { error: adminError } = await supabase.from('admins').insert({
        profile_id: userId,
        school_id: schoolId,
        role: 'super_admin',
      });

      if (adminError) {
        console.log('Retrying with profileId...');
        const { error: adminError2 } = await supabase.from('admins').insert({
          profile_id: profileId,
          school_id: schoolId,
          role: 'super_admin',
        });
        if (adminError2) {
          console.error('Failed to create admin:', adminError2.message);
        } else {
          console.log('✅ Created admin record with profileId');
        }
      } else {
        console.log('✅ Created admin record with userId');
      }
    }
  } else if (account.role === 'teacher') {
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existingTeacher) {
      console.log('✅ Teacher record exists:', existingTeacher.id);
    } else {
      console.log('Creating teacher record...');
      const { error: teacherError } = await supabase.from('teachers').insert({
        profile_id: profileId,
        school_id: schoolId,
        employee_id: (account.metadata?.employee_id as string) || 'EMP001',
      });

      if (teacherError) {
        console.error('Failed to create teacher:', teacherError.message);
      } else {
        console.log('✅ Created teacher record');
      }
    }
  } else if (account.role === 'student') {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existingStudent) {
      console.log('✅ Student record exists:', existingStudent.id);
    } else {
      console.log('Creating student record...');
      const { error: studentError } = await supabase.from('students').insert({
        profile_id: profileId,
        school_id: schoolId,
        section_id: sectionId,
        grade_level: (account.metadata?.grade_level as string) || '10',
        lrn: (account.metadata?.lrn as string) || '123456789012',
        status: 'active',
      });

      if (studentError) {
        console.error('Failed to create student:', studentError.message);
      } else {
        console.log('✅ Created student record');
      }
    }
  }
}

async function verifyLogin(email: string, password: string): Promise<boolean> {
  const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await testClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log(`  Login test failed: ${error.message}`);
    return false;
  }

  console.log(`  ✅ Login successful, user ID: ${data.user.id}`);
  return true;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Fixing Test Accounts');
  console.log('='.repeat(60));

  try {
    const schoolId = await getOrCreateSchool();
    console.log('School ID:', schoolId);

    const sectionId = await getOrCreateSection(schoolId);
    console.log('Section ID:', sectionId);

    for (const account of testAccounts) {
      await fixAccount(account, schoolId, sectionId);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Verifying Logins');
    console.log('='.repeat(60));

    for (const account of testAccounts) {
      console.log(`\nTesting ${account.email}...`);
      await verifyLogin(account.email, account.password);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Accounts Ready!');
    console.log('='.repeat(60));
    console.log('\nCredentials:\n');
    for (const account of testAccounts) {
      console.log(`${account.role.toUpperCase().padEnd(10)} ${account.email.padEnd(30)} ${account.password}`);
    }
    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
