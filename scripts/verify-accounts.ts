
/**
 * Verify and complete account setup
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

const testAccounts = [
  { email: 'admin.demo@msu.edu.ph', role: 'admin', fullName: 'Admin Demo' },
  { email: 'teacher.demo@msu.edu.ph', role: 'teacher', fullName: 'Teacher Demo' },
  { email: 'student.demo@msu.edu.ph', role: 'student', fullName: 'Student Demo' },
];

async function main() {
  console.log('Verifying and fixing account setup...\n');

  // Get school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  const schoolId = school?.id;
  console.log('School ID:', schoolId);

  // Get section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', schoolId)
    .single();

  const sectionId = section?.id;
  console.log('Section ID:', sectionId);

  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  for (const account of testAccounts) {
    console.log(`\n--- ${account.email} ---`);

    const authUser = authUsers?.users?.find(u => u.email === account.email);
    if (!authUser) {
      console.log('  ❌ Auth user not found');
      continue;
    }

    const userId = authUser.id;
    console.log('  Auth User ID:', userId);

    // Check school_profile
    let { data: profile } = await supabase
      .from('school_profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (!profile) {
      console.log('  Creating school_profile...');
      const { data: newProfile, error } = await supabase
        .from('school_profiles')
        .insert({
          auth_user_id: userId,
          full_name: account.fullName,
        })
        .select()
        .single();

      if (error) {
        console.log('  ❌ Failed:', error.message);
        continue;
      }
      profile = newProfile;
      console.log('  ✅ Created school_profile:', profile.id);
    } else {
      console.log('  ✅ School Profile ID:', profile.id);
    }

    // Check role-specific record
    if (account.role === 'admin') {
      // Admin uses userId directly
      let { data: adminRec } = await supabase
        .from('admins')
        .select('*')
        .eq('profile_id', userId)
        .single();

      if (!adminRec) {
        console.log('  Creating admin record...');
        const { error } = await supabase.from('admins').insert({
          profile_id: userId,
          school_id: schoolId,
          role: 'super_admin',
        });
        if (error) {
          console.log('  ❌ Failed:', error.message);
        } else {
          console.log('  ✅ Created admin record');
        }
      } else {
        console.log('  ✅ Admin record exists');
      }
    } else if (account.role === 'teacher') {
      let { data: teacherRec } = await supabase
        .from('teachers')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (!teacherRec) {
        console.log('  Creating teacher record...');
        const { error } = await supabase.from('teachers').insert({
          profile_id: profile.id,
          school_id: schoolId,
          employee_id: 'EMP001',
        });
        if (error) {
          console.log('  ❌ Failed:', error.message);
        } else {
          console.log('  ✅ Created teacher record');
        }
      } else {
        console.log('  ✅ Teacher record exists:', teacherRec.id);
      }
    } else if (account.role === 'student') {
      let { data: studentRec } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (!studentRec) {
        console.log('  Creating student record...');
        const { error } = await supabase.from('students').insert({
          profile_id: profile.id,
          school_id: schoolId,
          section_id: sectionId,
          grade_level: '10',
          lrn: '123456789012',
          status: 'active',
        });
        if (error) {
          console.log('  ❌ Failed:', error.message);
        } else {
          console.log('  ✅ Created student record');
        }
      } else {
        console.log('  ✅ Student record exists:', studentRec.id);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Account Verification Complete!');
  console.log('='.repeat(50));
  console.log('\nTest Credentials:');
  console.log('ADMIN:   admin.demo@msu.edu.ph / Demo123!@#');
  console.log('TEACHER: teacher.demo@msu.edu.ph / Demo123!@#');
  console.log('STUDENT: student.demo@msu.edu.ph / Demo123!@#');
}

main();
