/**
 * Reset Demo Passwords Script
 *
 * Lists all accounts from auth.users and resets passwords to Demo123!@#
 * Also outputs the SQL query to view all accounts with their roles.
 *
 * Run with: npx tsx scripts/reset-demo-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set');
  console.error('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set');
  console.error('Make sure .env.local exists with SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const NEW_PASSWORD = 'Demo123!@#';

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'unknown';
  fullName: string | null;
  createdAt: string;
  lastSignIn: string | null;
}

async function getUserRole(userId: string): Promise<{ role: 'admin' | 'teacher' | 'student' | 'unknown'; fullName: string | null }> {
  // First, find the school_profile for this auth user
  const { data: schoolProfile } = await supabase
    .from('school_profiles')
    .select('id, full_name')
    .eq('auth_user_id', userId)
    .single();

  const profileId = schoolProfile?.id;
  const fullName = schoolProfile?.full_name || null;

  // Check admins - try with auth.users.id first (based on existing schema)
  const { data: adminByUserId } = await supabase
    .from('admins')
    .select('id')
    .eq('profile_id', userId)
    .single();

  if (adminByUserId) {
    return { role: 'admin', fullName };
  }

  // Try admin with school_profiles.id
  if (profileId) {
    const { data: adminByProfileId } = await supabase
      .from('admins')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (adminByProfileId) {
      return { role: 'admin', fullName };
    }
  }

  // If no school_profile, can't be teacher or student
  if (!profileId) {
    return { role: 'unknown', fullName: null };
  }

  // Check teachers
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (teacher) {
    return { role: 'teacher', fullName };
  }

  // Check students
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profileId)
    .single();

  if (student) {
    return { role: 'student', fullName };
  }

  return { role: 'unknown', fullName };
}

async function listAllUsers(): Promise<UserWithRole[]> {
  console.log('Fetching all users from auth.users...\n');

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error.message);
    throw error;
  }

  const users = data.users || [];
  const usersWithRoles: UserWithRole[] = [];

  for (const user of users) {
    const { role, fullName } = await getUserRole(user.id);
    usersWithRoles.push({
      id: user.id,
      email: user.email || 'no-email',
      role,
      fullName,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at || null,
    });
  }

  return usersWithRoles;
}

async function resetAllPasswords(users: UserWithRole[]): Promise<void> {
  console.log(`\nResetting passwords for ${users.length} users to: ${NEW_PASSWORD}\n`);
  console.log('-'.repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    process.stdout.write(`Updating ${user.email.padEnd(35)}... `);

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (error) {
      console.log(`FAILED: ${error.message}`);
      failCount++;
    } else {
      console.log('OK');
      successCount++;
    }
  }

  console.log('-'.repeat(80));
  console.log(`\nResults: ${successCount} succeeded, ${failCount} failed`);
}

function printAccountsTable(users: UserWithRole[]): void {
  console.log('\n' + '='.repeat(100));
  console.log('ALL ACCOUNTS');
  console.log('='.repeat(100));
  console.log(
    'Role'.padEnd(12) +
    'Email'.padEnd(35) +
    'Full Name'.padEnd(25) +
    'Password'
  );
  console.log('-'.repeat(100));

  // Sort by role priority: admin, teacher, student, unknown
  const rolePriority = { admin: 1, teacher: 2, student: 3, unknown: 4 };
  const sortedUsers = [...users].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

  for (const user of sortedUsers) {
    console.log(
      user.role.toUpperCase().padEnd(12) +
      user.email.padEnd(35) +
      (user.fullName || '-').slice(0, 23).padEnd(25) +
      NEW_PASSWORD
    );
  }

  console.log('='.repeat(100));
}

function printDemoAccountsTable(): void {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO ACCOUNTS (Primary Test Accounts)');
  console.log('='.repeat(60));
  console.log('| Role    | Email                          | Password    |');
  console.log('|---------|--------------------------------|-------------|');
  console.log('| Admin   | admin.demo@msu.edu.ph          | Demo123!@#  |');
  console.log('| Teacher | teacher.demo@msu.edu.ph        | Demo123!@#  |');
  console.log('| Student | student.demo@msu.edu.ph        | Demo123!@#  |');
  console.log('='.repeat(60));
}

function printSqlQuery(): void {
  console.log('\n' + '='.repeat(100));
  console.log('SQL QUERY TO VIEW ALL ACCOUNTS WITH ROLES');
  console.log('Run this in Supabase Dashboard > SQL Editor');
  console.log('='.repeat(100));
  console.log(`
-- View all accounts with their roles
SELECT
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  sp.full_name,
  CASE
    WHEN a.id IS NOT NULL THEN 'admin'
    WHEN t.id IS NOT NULL THEN 'teacher'
    WHEN s.id IS NOT NULL THEN 'student'
    ELSE 'unknown'
  END AS role,
  COALESCE(a.role, 'N/A') AS admin_role,
  COALESCE(t.employee_id, s.lrn, 'N/A') AS identifier
FROM auth.users au
LEFT JOIN school_profiles sp ON sp.auth_user_id = au.id
LEFT JOIN admins a ON a.profile_id = au.id OR a.profile_id = sp.id
LEFT JOIN teachers t ON t.profile_id = sp.id
LEFT JOIN students s ON s.profile_id = sp.id
ORDER BY
  CASE
    WHEN a.id IS NOT NULL THEN 1
    WHEN t.id IS NOT NULL THEN 2
    WHEN s.id IS NOT NULL THEN 3
    ELSE 4
  END,
  au.email;
`);
  console.log('='.repeat(100));
}

async function main(): Promise<void> {
  console.log('='.repeat(100));
  console.log('RESET DEMO PASSWORDS SCRIPT');
  console.log('='.repeat(100));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`New Password: ${NEW_PASSWORD}`);
  console.log('');

  try {
    // Step 1: List all users with their roles
    const users = await listAllUsers();

    if (users.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    console.log(`Found ${users.length} users in auth.users`);

    // Step 2: Reset all passwords
    await resetAllPasswords(users);

    // Step 3: Print accounts table
    printAccountsTable(users);

    // Step 4: Print demo accounts summary
    printDemoAccountsTable();

    // Step 5: Print SQL query
    printSqlQuery();

    console.log('\nPassword reset complete!');
    console.log('All accounts now use password: ' + NEW_PASSWORD);

  } catch (error) {
    console.error('\nScript failed:', error);
    process.exit(1);
  }
}

main();
