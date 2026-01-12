import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client with service role key for full access
const supabase = createClient(url, serviceKey, {
  db: { schema: 'school software' }
});

console.log('\n📊 Checking Existing Data in "school software" Schema...\n');
console.log('═'.repeat(70));

// Check schools
console.log('\n🏫 SCHOOLS:');
const { data: schools, error: schoolsError } = await supabase
  .from('schools')
  .select('id, name')
  .limit(5);

if (schoolsError) {
  console.log('❌ Error:', schoolsError.message);
} else {
  console.log(`✅ Found ${schools?.length || 0} schools`);
  schools?.forEach(s => console.log(`   - ${s.name} (${s.id})`));
}

// Check profiles
console.log('\n👤 PROFILES:');
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, full_name, auth_user_id')
  .limit(10);

if (profilesError) {
  console.log('❌ Error:', profilesError.message);
} else {
  console.log(`✅ Found ${profiles?.length || 0} profiles`);
  profiles?.forEach(p => console.log(`   - ${p.full_name} (${p.id.substring(0, 8)}...)`));
}

// Check students
console.log('\n🎓 STUDENTS:');
const { data: students, error: studentsError } = await supabase
  .from('students')
  .select('id, student_number, profile_id')
  .limit(10);

if (studentsError) {
  console.log('❌ Error:', studentsError.message);
} else {
  console.log(`✅ Found ${students?.length || 0} students`);
  students?.forEach(s => console.log(`   - Student #${s.student_number} (${s.id.substring(0, 8)}...)`));
}

// Check teachers
console.log('\n👨‍🏫 TEACHERS:');
const { data: teachers, error: teachersError } = await supabase
  .from('teachers')
  .select('id, employee_number, profile_id')
  .limit(10);

if (teachersError) {
  console.log('❌ Error:', teachersError.message);
} else {
  console.log(`✅ Found ${teachers?.length || 0} teachers`);
  teachers?.forEach(t => console.log(`   - Employee #${t.employee_number} (${t.id.substring(0, 8)}...)`));
}

// Check courses
console.log('\n📚 COURSES:');
const { data: courses, error: coursesError } = await supabase
  .from('courses')
  .select('id, code, name')
  .limit(10);

if (coursesError) {
  console.log('❌ Error:', coursesError.message);
} else {
  console.log(`✅ Found ${courses?.length || 0} courses`);
  courses?.forEach(c => console.log(`   - ${c.code}: ${c.name}`));
}

// Check sections
console.log('\n📝 SECTIONS:');
const { data: sections, error: sectionsError } = await supabase
  .from('sections')
  .select('id, name, course_id')
  .limit(10);

if (sectionsError) {
  console.log('❌ Error:', sectionsError.message);
} else {
  console.log(`✅ Found ${sections?.length || 0} sections`);
  sections?.forEach(s => console.log(`   - ${s.name} (${s.id.substring(0, 8)}...)`));
}

// Check enrollments
console.log('\n✏️ ENROLLMENTS:');
const { data: enrollments, error: enrollmentsError } = await supabase
  .from('enrollments')
  .select('id, student_id, section_id, status')
  .limit(10);

if (enrollmentsError) {
  console.log('❌ Error:', enrollmentsError.message);
} else {
  console.log(`✅ Found ${enrollments?.length || 0} enrollments`);
  const statusCounts = enrollments?.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`   Status breakdown:`, statusCounts);
}

// Check admin_profiles
console.log('\n👑 ADMIN PROFILES:');
const { data: admins, error: adminsError } = await supabase
  .from('admin_profiles')
  .select('id, role, is_active, profile_id')
  .limit(10);

if (adminsError) {
  console.log('❌ Error:', adminsError.message);
} else {
  console.log(`✅ Found ${admins?.length || 0} admin profiles`);
  admins?.forEach(a => console.log(`   - Role: ${a.role}, Active: ${a.is_active}`));
}

console.log('\n' + '═'.repeat(70));
console.log('✅ Data check complete!\n');
