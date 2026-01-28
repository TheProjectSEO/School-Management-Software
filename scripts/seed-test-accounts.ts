/**
 * Seed Test Accounts Script
 *
 * Creates test accounts for admin, teacher, and student roles
 * Run with: npx tsx scripts/seed-test-accounts.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qyjzqzqqjimittltttph.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  console.error('Make sure .env.local exists with SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

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
  // Check if school exists
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  if (existingSchool) {
    console.log('Found existing school:', existingSchool.id);
    return existingSchool.id;
  }

  // Create school
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

  if (error) {
    console.error('Error creating school:', error);
    throw error;
  }

  console.log('Created new school:', newSchool.id);
  return newSchool.id;
}

async function getOrCreateSection(schoolId: string): Promise<string> {
  // Check if section exists
  const { data: existingSection } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', 'Grade 10-A')
    .single();

  if (existingSection) {
    console.log('Found existing section:', existingSection.id);
    return existingSection.id;
  }

  // Create section
  const { data: newSection, error } = await supabase
    .from('sections')
    .insert({
      school_id: schoolId,
      name: 'Grade 10-A',
      grade_level: '10',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating section:', error);
    throw error;
  }

  console.log('Created new section:', newSection.id);
  return newSection.id;
}

async function createTestAccount(account: TestAccount, schoolId: string, sectionId: string) {
  console.log(`\nProcessing ${account.role}: ${account.email}`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === account.email);

  let userId: string;

  if (existingUser) {
    console.log(`  User already exists: ${existingUser.id}`);
    userId = existingUser.id;

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: account.password,
    });
    if (updateError) {
      console.log(`  Warning: Could not update password: ${updateError.message}`);
    } else {
      console.log(`  Password updated`);
    }
  } else {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
      },
    });

    if (authError) {
      console.error(`  Error creating auth user: ${authError.message}`);
      return;
    }

    userId = authUser.user.id;
    console.log(`  Created auth user: ${userId}`);
  }

  // Check if school_profile exists
  const { data: existingProfile } = await supabase
    .from('school_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  let profileId: string;

  if (existingProfile) {
    profileId = existingProfile.id;
    console.log(`  School profile exists: ${profileId}`);
  } else {
    // Create school_profile
    const { data: newProfile, error: profileError } = await supabase
      .from('school_profiles')
      .insert({
        auth_user_id: userId,
        full_name: account.fullName,
        phone: '+639123456789',
      })
      .select('id')
      .single();

    if (profileError) {
      console.error(`  Error creating school_profile: ${profileError.message}`);
      return;
    }

    profileId = newProfile.id;
    console.log(`  Created school_profile: ${profileId}`);
  }

  // Create role-specific record
  if (account.role === 'admin') {
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (!existingAdmin) {
      const { error: adminError } = await supabase.from('admins').insert({
        profile_id: userId,
        school_id: schoolId,
        role: 'super_admin',
      });

      if (adminError) {
        console.error(`  Error creating admin record: ${adminError.message}`);
      } else {
        console.log(`  Created admin record`);
      }
    } else {
      console.log(`  Admin record exists`);
    }
  } else if (account.role === 'teacher') {
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (!existingTeacher) {
      const { error: teacherError } = await supabase.from('teachers').insert({
        profile_id: profileId,
        school_id: schoolId,
        employee_id: (account.metadata?.employee_id as string) || 'EMP001',
      });

      if (teacherError) {
        console.error(`  Error creating teacher record: ${teacherError.message}`);
      } else {
        console.log(`  Created teacher record`);
      }
    } else {
      console.log(`  Teacher record exists`);
    }
  } else if (account.role === 'student') {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (!existingStudent) {
      const { error: studentError } = await supabase.from('students').insert({
        profile_id: profileId,
        school_id: schoolId,
        section_id: sectionId,
        grade_level: (account.metadata?.grade_level as string) || '10',
        lrn: (account.metadata?.lrn as string) || '123456789012',
        status: 'active',
      });

      if (studentError) {
        console.error(`  Error creating student record: ${studentError.message}`);
      } else {
        console.log(`  Created student record`);
      }
    } else {
      console.log(`  Student record exists`);
    }
  }

  console.log(`  ✅ ${account.role} account ready: ${account.email} / ${account.password}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding Test Accounts');
  console.log('='.repeat(60));

  try {
    // Get or create school
    const schoolId = await getOrCreateSchool();

    // Get or create section
    const sectionId = await getOrCreateSection(schoolId);

    // Create test accounts
    for (const account of testAccounts) {
      await createTestAccount(account, schoolId, sectionId);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Accounts Summary');
    console.log('='.repeat(60));
    console.log('\nYou can now log in with these credentials:\n');

    for (const account of testAccounts) {
      console.log(`${account.role.toUpperCase().padEnd(10)} ${account.email.padEnd(30)} ${account.password}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Seed completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
