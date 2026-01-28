import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

console.log('\n🔍 CHECKING ACTUAL DATABASE SCHEMA...\n');

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ ${tableName} - DOES NOT EXIST`);
        return false;
      }
      console.log(`⚠️  ${tableName} - ERROR: ${error.message}`);
      return false;
    }

    console.log(`✅ ${tableName} - EXISTS`);
    return true;
  } catch (err) {
    console.log(`❌ ${tableName} - ERROR: ${err.message}`);
    return false;
  }
}

async function checkData(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(1);

    if (!error) {
      console.log(`   └─ Records: ${count || 0}`);
      if (data && data.length > 0) {
        console.log(`   └─ Sample columns:`, Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    // Ignore
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('CORE TABLES (needed for admin login):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const profiles = await checkTable('profiles');
if (profiles) await checkData('profiles');

const schools = await checkTable('schools');
if (schools) await checkData('schools');

const schoolMembers = await checkTable('school_members');
if (schoolMembers) await checkData('school_members');

const students = await checkTable('students');
if (students) await checkData('students');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUPPORTING TABLES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

await checkTable('sections');
await checkTable('courses');
await checkTable('enrollments');
await checkTable('teacher_profiles');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('DIAGNOSIS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!schoolMembers) {
  console.log('❌ PROBLEM: school_members table is MISSING!');
  console.log('');
  console.log('   The admin login code expects this table but it doesn\'t exist.');
  console.log('   This is why I made the wrong assumption.');
  console.log('');
  console.log('   📋 YOU NEED TO:');
  console.log('   1. Create the school_members table');
  console.log('   2. OR use a different table that already exists');
  console.log('');
}

if (profiles && schools && schoolMembers) {
  console.log('✅ ALL REQUIRED TABLES EXIST');
  console.log('   You can proceed with admin user creation!');
}

console.log('');
