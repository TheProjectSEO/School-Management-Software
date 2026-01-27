import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get all teachers
  console.log('Fetching all teachers...\n');

  const { data: teachers, error: teacherError } = await supabase
    .from('teachers')
    .select('id, profile_id');

  if (teacherError) {
    console.log('Error fetching teachers:', teacherError.message);
    return;
  }

  const profileIds = teachers?.map(t => t.profile_id).filter(Boolean) || [];

  // Get profiles for these teachers
  const { data: profiles, error: profileError } = await supabase
    .from('school_profiles')
    .select('id, auth_user_id, full_name')
    .in('id', profileIds);

  if (profileError) {
    console.log('Error fetching profiles:', profileError.message);
    return;
  }

  console.log('Teachers:');
  for (const p of profiles || []) {
    console.log(' -', p.full_name, '| auth_id:', p.auth_user_id);
  }

  // Search for Felicity in all profiles
  console.log('\nSearching for Felicity in all school_profiles...');
  const { data: felicityProfiles, error: felicityError } = await supabase
    .from('school_profiles')
    .select('id, auth_user_id, full_name')
    .ilike('full_name', '%felicity%');

  if (felicityError) {
    console.log('Error:', felicityError.message);
  } else if (felicityProfiles && felicityProfiles.length > 0) {
    console.log('Found Felicity:');
    for (const p of felicityProfiles) {
      console.log(' -', p.full_name, '| auth_id:', p.auth_user_id);
    }
  } else {
    console.log('No profile with "felicity" in name found');
  }
}

main().catch(console.error);
