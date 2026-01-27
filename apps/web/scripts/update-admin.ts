import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const newPassword = 'demo123@z';

  console.log('Finding admin accounts...\n');

  // Get admins from admins table
  const { data: admins, error } = await supabase
    .from('admins')
    .select('id, profile_id, school_id');

  if (error) {
    console.log('Error fetching admins:', error.message);
  } else {
    console.log('Found', admins?.length, 'admin records in admins table');
    console.log('Admin records:', JSON.stringify(admins, null, 2));

    for (const admin of admins || []) {
      console.log('\nProcessing admin:', admin.id);
      console.log('  profile_id:', admin.profile_id);

      if (!admin.profile_id) {
        console.log('  No profile_id, skipping...');
        continue;
      }

      // Get profile info - try maybeSingle instead of single
      const { data: profile, error: profileError } = await supabase
        .from('school_profiles')
        .select('id, auth_user_id, full_name')
        .eq('id', admin.profile_id)
        .maybeSingle();

      if (profileError) {
        console.log('  Profile error:', profileError.message);
      }

      // If no profile, the admin.profile_id might actually be the auth.users id
      if (!profile) {
        console.log('  No school_profile found, trying profile_id as auth_user_id directly...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(admin.profile_id, {
          password: newPassword
        });

        if (updateError) {
          console.log('  Password update ERROR:', updateError.message);
        } else {
          console.log('  SUCCESS! Password updated to:', newPassword);
        }
        continue;
      }

      if (profile) {
        console.log('  Name:', profile.full_name);
        console.log('  auth_user_id:', profile.auth_user_id);

        if (profile.auth_user_id) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(profile.auth_user_id, {
            password: newPassword
          });

          if (updateError) {
            console.log('  Password update ERROR:', updateError.message);
          } else {
            console.log('  SUCCESS! Password updated to:', newPassword);
          }
        } else {
          console.log('  No auth_user_id found');
        }
      }
    }
  }
}

main().catch(console.error);
