/**
 * Fix admin account
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
  console.log('Checking admins table structure...\n');

  // Get columns of admins table
  const { data: columns, error } = await supabase.rpc('get_table_columns', {
    table_name: 'admins'
  });

  if (error) {
    console.log('RPC not available, trying direct query...');

    // Try to select from admins to see what columns exist
    const { data: admins, error: selectError } = await supabase
      .from('admins')
      .select('*')
      .limit(1);

    if (selectError) {
      console.log('Error:', selectError.message);
    } else {
      console.log('Sample admin record:', admins);
      if (admins && admins.length > 0) {
        console.log('Columns:', Object.keys(admins[0]));
      }
    }
  } else {
    console.log('Columns:', columns);
  }

  // Get the admin user ID
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: loginData } = await anonClient.auth.signInWithPassword({
    email: 'admin.demo@msu.edu.ph',
    password: 'Demo123!@#',
  });

  if (!loginData?.user) {
    console.log('Could not find admin user');
    return;
  }

  const userId = loginData.user.id;
  console.log('\nAdmin auth user ID:', userId);

  // Get school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'msu-demo')
    .single();

  if (!school) {
    console.log('No school found');
    return;
  }

  console.log('School ID:', school.id);

  // Check if admin record exists
  const { data: existingAdmin, error: adminError } = await supabase
    .from('admins')
    .select('*')
    .eq('profile_id', userId)
    .single();

  if (adminError && adminError.code !== 'PGRST116') {
    console.log('Error checking admin:', adminError.message);
  }

  if (existingAdmin) {
    console.log('\nAdmin record already exists:', existingAdmin);
    return;
  }

  // Try to insert admin without role column
  console.log('\nCreating admin record (without role column)...');
  const { data: newAdmin, error: insertError } = await supabase
    .from('admins')
    .insert({
      profile_id: userId,
      school_id: school.id,
    })
    .select()
    .single();

  if (insertError) {
    console.log('Insert error:', insertError.message);
    console.log('Details:', insertError);
  } else {
    console.log('Created admin record:', newAdmin);
  }
}

main().catch(console.error);
