import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

console.log('🚀 Creating admin user in Supabase...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

// Admin user credentials
const adminEmail = 'admin@msu.edu.ph';
const adminPassword = 'Admin123!@#';
const adminFullName = 'System Administrator';

console.log('📝 Admin credentials:');
console.log(`   Email: ${adminEmail}`);
console.log(`   Password: ${adminPassword}`);
console.log(`   Full Name: ${adminFullName}\n`);

// Step 1: Check if user already exists in auth
console.log('Step 1: Checking if admin user exists in auth.users...');
const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
const userExists = existingAuthUser?.users?.some(u => u.email === adminEmail);

let userId;

if (userExists) {
  console.log('⚠️  Admin user already exists in auth.users');
  const user = existingAuthUser.users.find(u => u.email === adminEmail);
  userId = user.id;
  console.log(`   User ID: ${userId}\n`);
} else {
  console.log('ℹ️  Admin user does not exist in auth.users');
  console.log('⚠️  NOTE: You need to create the user manually via Supabase Dashboard');
  console.log('   OR use the Supabase Service Role key (not anon key)\n');
  console.log('📋 Manual creation steps:');
  console.log('   1. Go to: https://qyjzqzqqjimittltttph.supabase.co');
  console.log('   2. Navigate to: Authentication → Users');
  console.log('   3. Click "Add user"');
  console.log(`   4. Email: ${adminEmail}`);
  console.log(`   5. Password: ${adminPassword}`);
  console.log('   6. Auto Confirm User: ✓ Yes');
  console.log('   7. Click "Create user"\n');
  console.log('⏸️  Waiting for you to create the user manually...');
  console.log('   After creating the user, run this script again.\n');
  process.exit(0);
}

// Step 2: Check if profile exists
console.log('Step 2: Checking if profile exists...');
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('*')
  .eq('auth_user_id', userId)
  .single();

let profileId;

if (existingProfile) {
  console.log('✅ Profile exists');
  console.log(`   Profile ID: ${existingProfile.id}`);
  profileId = existingProfile.id;
} else {
  console.log('ℹ️  Profile does not exist, creating...');
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: userId,
      full_name: adminFullName,
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Failed to create profile:', profileError.message);
    console.error('   This might be due to RLS policies. You may need to use Service Role key.');
    process.exit(1);
  }

  console.log('✅ Profile created successfully');
  console.log(`   Profile ID: ${newProfile.id}`);
  profileId = newProfile.id;
}

// Step 3: Get school ID
console.log('\nStep 3: Getting school ID...');
const { data: schools, error: schoolError } = await supabase
  .from('schools')
  .select('id, name')
  .limit(1)
  .single();

if (schoolError || !schools) {
  console.error('❌ No schools found. You need to create a school first.');
  console.log('\n💡 Creating default school...');

  const { data: newSchool, error: createSchoolError } = await supabase
    .from('schools')
    .insert({
      slug: 'msu-main',
      name: 'Mindanao State University - Main Campus',
      region: 'Region XII',
      division: 'MSU System',
      accent_color: '#7B1113'
    })
    .select()
    .single();

  if (createSchoolError) {
    console.error('❌ Failed to create school:', createSchoolError.message);
    process.exit(1);
  }

  console.log('✅ School created successfully');
  console.log(`   School ID: ${newSchool.id}`);
  console.log(`   School Name: ${newSchool.name}`);
  schoolId = newSchool.id;
} else {
  console.log('✅ School found');
  console.log(`   School ID: ${schools.id}`);
  console.log(`   School Name: ${schools.name}`);
  var schoolId = schools.id;
}

// Step 4: Check if school_members entry exists
console.log('\nStep 4: Checking school_members...');
const { data: existingMember } = await supabase
  .from('school_members')
  .select('*')
  .eq('profile_id', profileId)
  .single();

if (existingMember) {
  console.log('✅ School member entry exists');
  console.log(`   Role: ${existingMember.role}`);
  console.log(`   Is Active: ${existingMember.is_active}`);

  if (existingMember.role !== 'school_admin' && existingMember.role !== 'super_admin') {
    console.log('⚠️  User is not an admin, updating role...');

    const { error: updateError } = await supabase
      .from('school_members')
      .update({ role: 'school_admin', is_active: true })
      .eq('profile_id', profileId);

    if (updateError) {
      console.error('❌ Failed to update role:', updateError.message);
    } else {
      console.log('✅ Role updated to school_admin');
    }
  }
} else {
  console.log('ℹ️  School member entry does not exist, creating...');

  const { data: newMember, error: memberError } = await supabase
    .from('school_members')
    .insert({
      profile_id: profileId,
      school_id: schoolId,
      role: 'school_admin',
      is_active: true
    })
    .select()
    .single();

  if (memberError) {
    console.error('❌ Failed to create school member:', memberError.message);
    console.error('   This might be due to RLS policies. You may need to use Service Role key.');
    process.exit(1);
  }

  console.log('✅ School member created successfully');
  console.log(`   Role: ${newMember.role}`);
  console.log(`   Is Active: ${newMember.is_active}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ ADMIN USER SETUP COMPLETE!');
console.log('='.repeat(60));
console.log('\n📋 Admin Login Credentials:');
console.log(`   URL: http://localhost:3002/login`);
console.log(`   Email: ${adminEmail}`);
console.log(`   Password: ${adminPassword}`);
console.log('\n🎉 You can now login to the admin portal!\n');
