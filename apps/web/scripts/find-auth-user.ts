import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const searchEmail = 'felicity';

  // Use RPC or direct query to find auth user by email
  const { data, error } = await supabase.rpc('get_user_by_email', { email_input: 'Felicity@gmail.com' });

  if (error) {
    console.log('RPC not available, trying alternative method...\n');
  } else if (data) {
    console.log('Found via RPC:', data);
    return;
  }

  // Try to sign in to check if account exists (will fail but tells us if user exists)
  console.log('Checking if Felicity@gmail.com exists in auth...');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'Felicity@gmail.com',
    password: 'wrong-password-just-checking'
  });

  if (signInError) {
    if (signInError.message.includes('Invalid login credentials')) {
      console.log('\nAuth account EXISTS for Felicity@gmail.com (wrong password used to check)');
      console.log('The account exists but is not linked to the school_profile.');
    } else if (signInError.message.includes('Email not confirmed')) {
      console.log('\nAuth account EXISTS but email not confirmed');
    } else {
      console.log('\nAuth account likely does NOT exist');
      console.log('Error:', signInError.message);
    }
  } else {
    console.log('Unexpected success - account exists');
  }
}

main().catch(console.error);
