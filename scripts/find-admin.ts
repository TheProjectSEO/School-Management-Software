import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function findAdmin() {
  const supabase = createAdminClient();

  console.log('=== ADMIN ACCOUNTS ===\n');

  // 1. Check profiles table for admin emails
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', '%admin%');

  console.log('Profiles with "admin" in email:');
  if (profiles?.length) {
    profiles.forEach(p => {
      console.log(`  Email: ${p.email}`);
      console.log(`  Name: ${p.full_name}`);
      console.log('');
    });
  } else {
    console.log('  None found\n');
  }

  // 2. Check school_profiles with admin role
  const { data: schoolAdmins } = await supabase
    .from('school_profiles')
    .select('id, full_name, role, auth_user_id')
    .eq('role', 'admin');

  console.log('School Profiles with admin role:');
  if (schoolAdmins?.length) {
    for (const a of schoolAdmins) {
      // Get email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', a.auth_user_id)
        .single();

      console.log(`  Name: ${a.full_name}`);
      console.log(`  Email: ${profile?.email || 'N/A'}`);
      console.log(`  Role: ${a.role}`);
      console.log('');
    }
  } else {
    console.log('  None found\n');
  }

  // 3. Check the known admin@gmail.com
  console.log('=== CHECKING admin@gmail.com ===\n');

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@gmail.com')
    .single();

  if (adminProfile) {
    console.log('✅ Found admin@gmail.com');
    console.log('   ID:', adminProfile.id);
    console.log('   Name:', adminProfile.full_name);
    console.log('   Email:', adminProfile.email);
  } else {
    console.log('❌ admin@gmail.com not found in profiles');
  }
}

findAdmin();
