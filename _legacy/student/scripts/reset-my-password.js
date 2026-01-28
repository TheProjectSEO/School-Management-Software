const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function resetPassword() {
  console.log('🔑 Resetting password for adityaamandigital@gmail.com...\n');
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'adityaamandigital@gmail.com');
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }

  const newPassword = 'MSUStudent2024!@#';
  
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Password reset failed:', error.message);
    return;
  }

  console.log('✅ PASSWORD RESET SUCCESSFUL!\n');
  console.log('🔐 NEW CREDENTIALS:');
  console.log('   Email:    adityaamandigital@gmail.com');
  console.log('   Password: MSUStudent2024!@#');
  console.log('   URL:      http://localhost:3000/login');
}

resetPassword();
