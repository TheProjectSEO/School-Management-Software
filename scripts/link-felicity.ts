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
  console.log('Attempting to update password for:', EMAIL, '\n');

  // Find user by listing users with pagination
  console.log('Trying listUsers with pagination...');
  let page = 1;
  const perPage = 50;
  let found = false;

  while (!found && page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.log('Error on page', page, ':', error.message);
      break;
    }

    if (!data.users || data.users.length === 0) {
      break;
    }

    const felicity = data.users.find(u =>
      u.email?.toLowerCase() === EMAIL.toLowerCase()
    );

    if (felicity) {
      console.log('Found on page', page);
      console.log('  ID:', felicity.id);
      console.log('  Email:', felicity.email);

      // Update password
      const { error: pwError } = await supabase.auth.admin.updateUserById(felicity.id, {
        password: NEW_PASSWORD
      });

      if (pwError) {
        console.log('Error updating password:', pwError.message);
      } else {
        console.log('\nPassword updated to:', NEW_PASSWORD);
      }

      // Link to school_profile
      const { data: profile } = await supabase
        .from('school_profiles')
        .select('id, full_name, auth_user_id')
        .ilike('full_name', '%felicity%')
        .single();

      if (profile && !profile.auth_user_id) {
        console.log('\nLinking to school_profile:', profile.full_name);
        await supabase
          .from('school_profiles')
          .update({ auth_user_id: felicity.id })
          .eq('id', profile.id);
        console.log('Linked!');
      }

      found = true;
    }

    page++;
  }

  if (!found) {
    console.log('\nCould not find user with email:', EMAIL);
    console.log('The account may not exist in auth.users');
  }
}

main().catch(console.error);
