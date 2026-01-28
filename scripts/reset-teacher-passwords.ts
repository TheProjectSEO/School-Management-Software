import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const NEW_PASSWORD = 'Admin@z1';

async function main() {
  console.log('='.repeat(60));
  console.log('RESET TEACHER PASSWORDS');
  console.log('='.repeat(60));
  console.log(`New Password: ${NEW_PASSWORD}\n`);

  // Get all teachers with their profiles
  const { data: teachers, error: teacherError } = await supabase
    .from('teachers')
    .select('id, profile_id');

  if (teacherError) {
    console.error('Error fetching teachers:', teacherError.message);
    process.exit(1);
  }

  if (!teachers || teachers.length === 0) {
    console.log('No teachers found.');
    return;
  }

  console.log(`Found ${teachers.length} teachers\n`);

  const profileIds = teachers.map(t => t.profile_id).filter(Boolean);

  // Get school_profiles to find auth_user_id
  const { data: profiles, error: profileError } = await supabase
    .from('school_profiles')
    .select('id, auth_user_id, full_name')
    .in('id', profileIds);

  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const profile of profiles || []) {
    if (!profile.auth_user_id) {
      console.log(`SKIP: ${profile.full_name} - no auth_user_id`);
      continue;
    }

    process.stdout.write(`Updating ${(profile.full_name || 'Unknown').padEnd(30)}... `);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.auth_user_id,
      { password: NEW_PASSWORD }
    );

    if (updateError) {
      console.log(`FAILED: ${updateError.message}`);
      failCount++;
    } else {
      console.log('OK');
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);
  console.log(`All teacher passwords set to: ${NEW_PASSWORD}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
