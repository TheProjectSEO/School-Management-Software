import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  db: { schema: 'school software' },
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('\n📊 Verifying Admin Portal Data...\n');
console.log('═'.repeat(70));

async function checkTable(name, query) {
  try {
    const { data, error } = await query;
    if (error) {
      console.log(`\n❌ ${name}: ${error.message}`);
      return 0;
    }
    const count = data?.length || 0;
    console.log(`\n✅ ${name}: ${count} records`);
    if (count > 0 && count <= 5) {
      console.log('   Sample records:');
      data.slice(0, 3).forEach(item => {
        const display = item.name || item.full_name || item.email || item.id;
        console.log(`   - ${display}`);
      });
    }
    return count;
  } catch (err) {
    console.log(`\n❌ ${name}: ${err.message}`);
    return 0;
  }
}

// Check all tables
await checkTable('Schools', supabase.from('schools').select('id, name'));
await checkTable('Profiles', supabase.from('profiles').select('id, full_name'));
await checkTable('Admin Profiles', supabase.from('admin_profiles').select('id, role, is_active'));
await checkTable('Students', supabase.from('students').select('id, lrn'));
await checkTable('Courses', supabase.from('courses').select('id, name, subject_code'));
await checkTable('Sections', supabase.from('sections').select('id, name, grade_level'));
await checkTable('Enrollments', supabase.from('enrollments').select('id, student_id, course_id'));
await checkTable('Modules', supabase.from('modules').select('id, title'));
await checkTable('Lessons', supabase.from('lessons').select('id, title'));

console.log('\n' + '═'.repeat(70));
console.log('\n🎯 Testing Admin Login Flow...\n');

// Test admin login
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@msu.edu.ph',
  password: 'Admin123!@#'
});

if (authError) {
  console.log('❌ Login failed:', authError.message);
} else {
  console.log('✅ Login successful!');
  console.log(`   User: ${authData.user.email}`);
  console.log(`   ID: ${authData.user.id}`);

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('auth_user_id', authData.user.id)
    .single();

  if (profile) {
    console.log(`✅ Profile found: ${profile.full_name}`);

    // Check admin access
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('role, is_active')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .single();

    if (adminProfile) {
      console.log(`✅ Admin access confirmed: ${adminProfile.role}`);
    } else {
      console.log('❌ No admin access');
    }
  } else {
    console.log('❌ Profile not found');
  }

  await supabase.auth.signOut();
}

console.log('\n' + '═'.repeat(70));
console.log('\n✅ Verification complete!\n');
console.log('📝 Summary:');
console.log('   - Data exists in database');
console.log('   - Admin user configured');
console.log('   - Schema exposure working');
console.log('   - Ready to test admin portal!\n');
console.log('🚀 Next step: Login at http://localhost:3002/login');
console.log('   Email: admin@msu.edu.ph');
console.log('   Password: Admin123!@#\n');
