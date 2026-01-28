import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function setPassword() {
  const supabase = createAdminClient();
  const email = 'admin@gmail.com';
  const newPassword = 'Admin@z1';

  console.log('=== SETTING ADMIN PASSWORD ===\n');

  // Get user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.log('Error listing users:', listError.message);
    return;
  }

  const adminUser = users?.users?.find(u => u.email === email);

  if (!adminUser) {
    console.log('❌ User not found:', email);
    console.log('\nAvailable users:');
    users?.users?.slice(0, 10).forEach(u => console.log('  -', u.email));
    return;
  }

  console.log('Found user:', adminUser.email);
  console.log('User ID:', adminUser.id);

  // Update password
  const { error } = await supabase.auth.admin.updateUserById(adminUser.id, {
    password: newPassword,
  });

  if (error) {
    console.log('\n❌ Error updating password:', error.message);
  } else {
    console.log('\n✅ Password updated successfully!');
    console.log('');
    console.log('┌─────────────────────────────────┐');
    console.log('│ ADMIN CREDENTIALS               │');
    console.log('├─────────────────────────────────┤');
    console.log('│ Email:    admin@gmail.com       │');
    console.log('│ Password: Admin@z1              │');
    console.log('└─────────────────────────────────┘');
  }
}

setPassword();
