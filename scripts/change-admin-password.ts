import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = 'admin@gmail.com';
  const newPassword = 'demo123@z';

  // Find teacher by email in school_profiles
  console.log('Looking for teacher with email:', email);

  const { data: profile, error: profileError } = await supabase
    .from('school_profiles')
    .select('id, auth_user_id, full_name')
    .eq('full_name', email)
    .single();

  if (!profileError && profile?.auth_user_id) {
    console.log('Found profile by name match:', profile.full_name, '| auth_user_id:', profile.auth_user_id);

    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.auth_user_id, {
      password: newPassword
    });

    if (updateError) {
      console.log('Error updating password:', updateError.message);
    } else {
      console.log('SUCCESS! Password updated for', profile.full_name, 'to:', newPassword);
      return;
    }
  }

  // Try to find by looking at teacher_profiles
  console.log('\nLooking in teacher_profiles...');
  const { data: teachers, error: teacherError } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, profile:school_profiles(id, auth_user_id, full_name)');

  if (!teacherError && teachers) {
    console.log('Found', teachers.length, 'teachers');
    for (const t of teachers) {
      const p = t.profile as any;
      if (p?.auth_user_id) {
        console.log('  -', p.full_name, '| auth_user_id:', p.auth_user_id);
      }
    }

    // Find Gabriel B Ignacio (the teacher for admin@gmail.com)
    const adminTeacher = teachers.find(t => {
      const p = t.profile as any;
      return p?.full_name?.toLowerCase().includes('gabriel');
    });

    if (adminTeacher) {
      const p = adminTeacher.profile as any;
      console.log('\nUpdating password for teacher:', p.full_name);

      const { error: updateError } = await supabase.auth.admin.updateUserById(p.auth_user_id, {
        password: newPassword
      });

      if (updateError) {
        console.log('Error:', updateError.message);
      } else {
        console.log('SUCCESS! Password updated to:', newPassword);
        return;
      }
    }
  }

  console.log('Looking for admin user with email:', email);

  // Method 1: Query the admins table to find admin users
  const { data: admins, error: adminError } = await supabase
    .from('admins')
    .select('id, profile_id, school_id, role');

  if (adminError) {
    console.log('Error fetching admins:', adminError.message);
  } else {
    console.log('Found', admins?.length, 'admin records');

    if (admins && admins.length > 0) {
      // Get the profile_ids to look up in school_profiles
      const profileIds = admins.map(a => a.profile_id).filter(Boolean);
      console.log('Admin profile IDs:', profileIds);

      // Get school_profiles to find auth_user_id
      const { data: profiles, error: profileError } = await supabase
        .from('school_profiles')
        .select('id, auth_user_id, full_name')
        .in('id', profileIds);

      if (profileError) {
        console.log('Error fetching profiles:', profileError.message);
      } else {
        console.log('Found profiles:', profiles?.map(p => ({ id: p.id, name: p.full_name, auth_user_id: p.auth_user_id })));

        for (const profile of profiles || []) {
          if (profile.auth_user_id) {
            console.log('\nTrying to update password for:', profile.full_name, '(auth_user_id:', profile.auth_user_id + ')');

            const { error: updateError } = await supabase.auth.admin.updateUserById(profile.auth_user_id, {
              password: newPassword
            });

            if (updateError) {
              console.log('Error updating password:', updateError.message);
            } else {
              console.log('SUCCESS! Password updated for', profile.full_name, 'to:', newPassword);
            }
          }
        }
      }
    }
  }

  // Method 2: Also check if we can find user in school_profiles with matching email
  console.log('\n\nMethod 2: Looking for profiles with auth_user_id...');
  const { data: allProfiles, error: allProfilesError } = await supabase
    .from('school_profiles')
    .select('id, auth_user_id, full_name')
    .not('auth_user_id', 'is', null)
    .limit(20);

  if (allProfilesError) {
    console.log('Error:', allProfilesError.message);
  } else {
    console.log('Profiles with auth_user_id:', allProfiles?.length);
    allProfiles?.forEach(p => {
      console.log('  -', p.full_name, '| auth_user_id:', p.auth_user_id);
    });

    // Update ALL admin-like profiles
    const adminProfiles = allProfiles?.filter(p =>
      p.full_name?.toLowerCase().includes('admin') ||
      p.full_name?.toLowerCase().includes('system')
    );

    console.log('\nFound', adminProfiles?.length, 'admin-like profiles');
    for (const adminProfile of adminProfiles || []) {
      console.log('Updating password for:', adminProfile.full_name, '(', adminProfile.auth_user_id, ')');
      const { error: updateError } = await supabase.auth.admin.updateUserById(adminProfile.auth_user_id, {
        password: newPassword
      });

      if (updateError) {
        console.log('  Error:', updateError.message);
      } else {
        console.log('  SUCCESS!');
      }
    }
  }
}

main().catch(console.error);
