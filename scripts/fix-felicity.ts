import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEW_PASSWORD = 'Admin@z1';
const EMAIL = 'Felicity@gmail.com';

async function main() {
  console.log('Fixing account for:', EMAIL, '\n');

  // Try to create user (will fail if exists, but we can catch that)
  console.log('Step 1: Attempting to create or update user...');

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: NEW_PASSWORD,
    email_confirm: true
  });

  if (createError) {
    if (createError.message.includes('already been registered') ||
        createError.message.includes('already exists')) {
      console.log('User already exists, will try to update...');

      // Since we can't list users, try to get by id if we have it stored somewhere
      // Or use the generateLink method to get the user ID
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: EMAIL
      });

      if (linkError) {
        console.log('Error generating link:', linkError.message);
      } else if (linkData?.user) {
        console.log('Found user via generateLink:');
        console.log('  ID:', linkData.user.id);

        // Now update the password
        const { error: pwError } = await supabase.auth.admin.updateUserById(linkData.user.id, {
          password: NEW_PASSWORD
        });

        if (pwError) {
          console.log('Error updating password:', pwError.message);
        } else {
          console.log('Password updated to:', NEW_PASSWORD);
        }

        // Link to school_profile
        const { data: profile } = await supabase
          .from('school_profiles')
          .select('id, full_name, auth_user_id')
          .ilike('full_name', '%felicity%')
          .single();

        if (profile && !profile.auth_user_id) {
          console.log('\nLinking to school_profile:', profile.full_name);
          const { error: linkProfileError } = await supabase
            .from('school_profiles')
            .update({ auth_user_id: linkData.user.id })
            .eq('id', profile.id);

          if (linkProfileError) {
            console.log('Error linking:', linkProfileError.message);
          } else {
            console.log('Linked successfully!');
          }
        } else if (profile?.auth_user_id) {
          console.log('Profile already linked to:', profile.auth_user_id);
        }
      }
    } else {
      console.log('Create error:', createError.message);
    }
  } else {
    console.log('Created new user:');
    console.log('  ID:', createData.user.id);
    console.log('  Email:', createData.user.email);

    // Link to school_profile
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('id, full_name, auth_user_id')
      .ilike('full_name', '%felicity%')
      .single();

    if (profile) {
      console.log('\nLinking to school_profile:', profile.full_name);
      await supabase
        .from('school_profiles')
        .update({ auth_user_id: createData.user.id })
        .eq('id', profile.id);
      console.log('Linked!');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Login credentials:');
  console.log('  Email:', EMAIL);
  console.log('  Password:', NEW_PASSWORD);
  console.log('='.repeat(50));
}

main().catch(console.error);
