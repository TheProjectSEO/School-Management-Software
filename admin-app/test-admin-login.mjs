import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey, {
  db: { schema: 'public' }
});

console.log('\n🔐 Testing Admin Login Flow...\n');
console.log('═'.repeat(60));

const testEmail = 'admin@msu.edu.ph';
const testPassword = 'Admin123!@#';

// Step 1: Sign in
console.log('\n📝 Step 1: Authenticating with email/password...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});

if (authError) {
  console.log('❌ Authentication FAILED:', authError.message);
  process.exit(1);
}

console.log('✅ Authentication SUCCESS');
console.log(`   User ID: ${authData.user.id}`);
console.log(`   Email: ${authData.user.email}`);

// Step 2: Get user
console.log('\n📝 Step 2: Getting authenticated user...');
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
  console.log('❌ Get user FAILED:', userError?.message);
  process.exit(1);
}

console.log('✅ Get user SUCCESS');
console.log(`   User ID: ${user.id}`);

// Step 3: Get profile
console.log('\n📝 Step 3: Looking up user profile...');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, auth_user_id, full_name')
  .eq('auth_user_id', user.id)
  .single();

if (profileError) {
  console.log('❌ Profile lookup FAILED:', profileError.message);
  console.log('   Code:', profileError.code);
  console.log('   Details:', profileError.details);
  process.exit(1);
}

if (!profile) {
  console.log('❌ Profile NOT FOUND');
  process.exit(1);
}

console.log('✅ Profile lookup SUCCESS');
console.log(`   Profile ID: ${profile.id}`);
console.log(`   Full Name: ${profile.full_name}`);

// Step 4: Check admin access
console.log('\n📝 Step 4: Verifying admin access...');
const { data: adminProfile, error: adminError } = await supabase
  .from('admin_profiles')
  .select('id, role, is_active')
  .eq('profile_id', profile.id)
  .eq('is_active', true)
  .single();

if (adminError) {
  console.log('❌ Admin verification FAILED:', adminError.message);
  console.log('   Code:', adminError.code);
  process.exit(1);
}

if (!adminProfile) {
  console.log('❌ No admin access found');
  process.exit(1);
}

console.log('✅ Admin verification SUCCESS');
console.log(`   Admin ID: ${adminProfile.id}`);
console.log(`   Role: ${adminProfile.role}`);
console.log(`   Is Active: ${adminProfile.is_active}`);

// Step 5: Sign out
console.log('\n📝 Step 5: Signing out...');
await supabase.auth.signOut();
console.log('✅ Sign out SUCCESS');

console.log('\n' + '═'.repeat(60));
console.log('✅ ADMIN LOGIN TEST PASSED!');
console.log('═'.repeat(60));
console.log('\n🎉 The admin login flow is working correctly!');
console.log('\n📋 Admin Credentials:');
console.log(`   URL: http://localhost:3002/login`);
console.log(`   Email: ${testEmail}`);
console.log(`   Password: ${testPassword}`);
console.log('\n✅ You can now log in and test all admin features!\n');
