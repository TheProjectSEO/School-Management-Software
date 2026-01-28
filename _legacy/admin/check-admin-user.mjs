import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

console.log('🔍 Checking for admin users in Supabase...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

// Check profiles table
console.log('Checking profiles table...');
const { data: profiles, error: profileError } = await supabase
  .from('profiles')
  .select('*');

console.log('Profiles:', profiles?.length || 0);
if (profileError) {
  console.log('Profile Error:', profileError.message);
}

// Check admin_profiles table
console.log('\nChecking admin_profiles table...');
const { data: adminProfiles, error: adminError } = await supabase
  .from('admin_profiles')
  .select('*');

console.log('Admin Profiles:', adminProfiles?.length || 0);
if (adminError) {
  console.log('Admin Profile Error:', adminError.message);
}

// Check school_members for admin role
console.log('\nChecking school_members for admin roles...');
const { data: schoolMembers, error: memberError } = await supabase
  .from('school_members')
  .select('*, profiles(*)')
  .eq('role', 'school_admin');

console.log('School Admin Members:', schoolMembers?.length || 0);
if (memberError) {
  console.log('School Members Error:', memberError.message);
} else if (schoolMembers && schoolMembers.length > 0) {
  console.log('\n📋 Admin accounts found:');
  schoolMembers.forEach((member, i) => {
    console.log(`\n${i + 1}. Profile ID: ${member.profile_id}`);
    console.log(`   Full Name: ${member.profiles?.full_name || 'N/A'}`);
    console.log(`   Role: ${member.role}`);
    console.log(`   Active: ${member.is_active}`);
  });
} else {
  console.log('\n❌ No admin accounts found in school_members!');
  console.log('\n💡 You need to create an admin user.');
  console.log('   The test account should be: admin@test.com / Test123!');
}

console.log('\n\n🔧 Summary:');
console.log('─'.repeat(50));
console.log(`Profiles in database: ${profiles?.length || 0}`);
console.log(`Admin profiles: ${adminProfiles?.length || 0}`);
console.log(`School admin members: ${schoolMembers?.length || 0}`);
console.log('─'.repeat(50));
