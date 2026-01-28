import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function getStudents() {
  const supabase = createAdminClient();

  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      school_id,
      status,
      profile:profile_id (
        id,
        full_name,
        auth_user_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== STUDENT ACCOUNTS ===\n');

  for (let i = 0; i < students.length; i++) {
    const s: any = students[i];
    let email = 'N/A';

    // Get email from auth.users
    if (s.profile?.auth_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(s.profile.auth_user_id);
      email = authUser?.user?.email || 'N/A';
    }

    console.log(`${i + 1}. ${s.profile?.full_name || 'N/A'}`);
    console.log(`   Email: ${email}`);
    console.log(`   LRN: ${s.lrn || 'N/A'}`);
    console.log(`   Status: ${s.status || 'N/A'}`);
    console.log('');
  }

  console.log(`Total: ${students.length} students`);
}

getStudents();
