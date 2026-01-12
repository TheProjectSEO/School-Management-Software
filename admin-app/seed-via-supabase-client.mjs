import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🌱 Seeding Admin Data via Supabase Client...\n');
console.log('═'.repeat(70));

// Create client with service role for bypassing RLS
const supabase = createClient(url, serviceKey, {
  db: { schema: 'school software' },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Track results
const results = {
  schools: 0,
  sections: 0,
  profiles: 0,
  students: 0,
  courses: 0,
  enrollments: 0,
  modules: 0,
  lessons: 0,
  assessments: 0,
  admin_profiles: 0,
  errors: []
};

// ============================================
// 1. CREATE SCHOOLS
// ============================================
console.log('\n🏫 Creating Schools...');
const schools = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'msu-main',
    name: 'Mindanao State University - Main Campus',
    region: 'Region X',
    division: 'Marawi City',
    logo_url: '/brand/logo.png',
    accent_color: '#7B1113'
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'demo-high',
    name: 'Demo High School',
    region: 'Region XII',
    division: 'General Santos City',
    logo_url: '/brand/demo-logo.png',
    accent_color: '#1E40AF'
  }
];

for (const school of schools) {
  const { error } = await supabase
    .from('schools')
    .upsert(school, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.log(`   ❌ ${school.name}: ${error.message}`);
    results.errors.push({ table: 'schools', error: error.message });
  } else {
    console.log(`   ✅ ${school.name}`);
    results.schools++;
  }
}

// ============================================
// 2. CREATE SECTIONS
// ============================================
console.log('\n📝 Creating Sections...');
const sections = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    name: 'BSCS 2-A',
    grade_level: 'College - 2nd Year'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    school_id: '11111111-1111-1111-1111-111111111111',
    name: 'BSIT 3-B',
    grade_level: 'College - 3rd Year'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    school_id: '00000000-0000-0000-0000-000000000001',
    name: 'Grade 10-A',
    grade_level: 'Grade 10'
  }
];

for (const section of sections) {
  const { error } = await supabase
    .from('sections')
    .upsert(section, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ ${section.name}: ${error.message}`);
    results.errors.push({ table: 'sections', error: error.message });
  } else {
    console.log(`   ✅ ${section.name}`);
    results.sections++;
  }
}

// ============================================
// 3. CREATE PROFILES (only demo student for now)
// ============================================
console.log('\n👤 Creating Profiles...');

// Get demo student auth_user_id
const { data: demoUser } = await supabase.auth.admin.listUsers();
const demoAuthUser = demoUser?.users?.find(u => u.email === 'demo@msu.edu.ph');

if (demoAuthUser) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
      auth_user_id: demoAuthUser.id,
      full_name: 'Demo Student',
      phone: '+63 917 111 1111'
    }, { onConflict: 'auth_user_id' });

  if (error) {
    console.log(`   ❌ Demo Student Profile: ${error.message}`);
    results.errors.push({ table: 'profiles', error: error.message });
  } else {
    console.log(`   ✅ Demo Student Profile`);
    results.profiles++;
  }
} else {
  console.log(`   ⚠️  Demo student auth user not found`);
}

// Admin profile already exists
console.log(`   ℹ️  Admin profile exists: 34b140da-2423-4519-a365-55d757a68e87`);

// ============================================
// 4. CREATE STUDENTS
// ============================================
console.log('\n🎓 Creating Students...');
const students = [
  {
    id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
    school_id: '11111111-1111-1111-1111-111111111111',
    profile_id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
    lrn: '123456789012',
    grade_level: 'College - 2nd Year',
    section_id: '22222222-2222-2222-2222-222222222222'
  }
];

for (const student of students) {
  const { error } = await supabase
    .from('students')
    .upsert(student, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ Student ${student.lrn}: ${error.message}`);
    results.errors.push({ table: 'students', error: error.message });
  } else {
    console.log(`   ✅ Student LRN: ${student.lrn}`);
    results.students++;
  }
}

// ============================================
// 5. CREATE COURSES
// ============================================
console.log('\n📚 Creating Courses...');
const courses = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Web Development Fundamentals',
    subject_code: 'CS 201',
    description: 'Learn the basics of HTML, CSS, and JavaScript to build modern websites.',
    cover_image_url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Data Structures and Algorithms',
    subject_code: 'CS 202',
    description: 'Master fundamental data structures like arrays, linked lists, trees, and graphs.',
    cover_image_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    school_id: '11111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    name: 'Philippine History and Government',
    subject_code: 'GE 103',
    description: 'Explore Philippine history from pre-colonial times to the present.',
    cover_image_url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800'
  }
];

for (const course of courses) {
  const { error } = await supabase
    .from('courses')
    .upsert(course, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ ${course.name}: ${error.message}`);
    results.errors.push({ table: 'courses', error: error.message });
  } else {
    console.log(`   ✅ ${course.subject_code}: ${course.name}`);
    results.courses++;
  }
}

// ============================================
// 6. CREATE ENROLLMENTS
// ============================================
console.log('\n✏️  Creating Enrollments...');
const enrollments = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    school_id: '11111111-1111-1111-1111-111111111111',
    student_id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
    course_id: 'c1111111-1111-1111-1111-111111111111'
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    student_id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
    course_id: 'c2222222-2222-2222-2222-222222222222'
  },
  {
    id: 'e3333333-3333-3333-3333-333333333333',
    school_id: '11111111-1111-1111-1111-111111111111',
    student_id: 'cc0c8b60-5736-4299-8015-e0a649119b8f',
    course_id: 'c3333333-3333-3333-3333-333333333333'
  }
];

for (const enrollment of enrollments) {
  const { error } = await supabase
    .from('enrollments')
    .upsert(enrollment, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ Enrollment ${enrollment.id.substring(0, 8)}: ${error.message}`);
    results.errors.push({ table: 'enrollments', error: error.message });
  } else {
    console.log(`   ✅ Enrolled in course`);
    results.enrollments++;
  }
}

// ============================================
// 7. CREATE MODULES
// ============================================
console.log('\n📦 Creating Modules...');
const modules = [
  {
    id: 'm1111111-1111-1111-1111-111111111111',
    course_id: 'c1111111-1111-1111-1111-111111111111',
    title: 'Introduction to HTML',
    description: 'Learn the building blocks of web pages',
    order: 1,
    duration_minutes: 60,
    is_published: true
  },
  {
    id: 'm1111111-1111-1111-1111-111111111112',
    course_id: 'c1111111-1111-1111-1111-111111111111',
    title: 'CSS Styling Basics',
    description: 'Style your HTML with CSS',
    order: 2,
    duration_minutes: 90,
    is_published: true
  },
  {
    id: 'm2222222-2222-2222-2222-222222222221',
    course_id: 'c2222222-2222-2222-2222-222222222222',
    title: 'Arrays and Linked Lists',
    description: 'Linear data structures fundamentals',
    order: 1,
    duration_minutes: 90,
    is_published: true
  }
];

for (const module of modules) {
  const { error } = await supabase
    .from('modules')
    .upsert(module, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ ${module.title}: ${error.message}`);
    results.errors.push({ table: 'modules', error: error.message });
  } else {
    console.log(`   ✅ ${module.title}`);
    results.modules++;
  }
}

// ============================================
// 8. CREATE LESSONS
// ============================================
console.log('\n📖 Creating Lessons...');
const lessons = [
  {
    id: 'l1111111-1111-1111-1111-111111111111',
    module_id: 'm1111111-1111-1111-1111-111111111111',
    title: 'What is HTML?',
    content: '<p>HTML (HyperText Markup Language) is the standard markup language for creating web pages.</p>',
    content_type: 'video',
    video_url: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
    duration_minutes: 20,
    order: 1,
    is_published: true
  },
  {
    id: 'l1111111-1111-1111-1111-111111111121',
    module_id: 'm1111111-1111-1111-1111-111111111112',
    title: 'Introduction to CSS',
    content: '<p>CSS (Cascading Style Sheets) controls the visual presentation of HTML elements.</p>',
    content_type: 'video',
    video_url: 'https://www.youtube.com/watch?v=yfoY53QXEnI',
    duration_minutes: 60,
    order: 1,
    is_published: true
  },
  {
    id: 'l2222222-2222-2222-2222-222222222211',
    module_id: 'm2222222-2222-2222-2222-222222222221',
    title: 'Introduction to Arrays',
    content: '<p>Arrays are the most fundamental data structure.</p>',
    content_type: 'video',
    video_url: 'https://www.youtube.com/watch?v=QJNwK2uJyGs',
    duration_minutes: 30,
    order: 1,
    is_published: true
  }
];

for (const lesson of lessons) {
  const { error } = await supabase
    .from('lessons')
    .upsert(lesson, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ ${lesson.title}: ${error.message}`);
    results.errors.push({ table: 'lessons', error: error.message });
  } else {
    console.log(`   ✅ ${lesson.title}`);
    results.lessons++;
  }
}

// ============================================
// 9. CREATE ASSESSMENTS
// ============================================
console.log('\n📝 Creating Assessments...');
const assessments = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    school_id: '11111111-1111-1111-1111-111111111111',
    course_id: 'c1111111-1111-1111-1111-111111111111',
    title: 'HTML Basics Quiz',
    description: 'Test your knowledge of HTML fundamentals',
    type: 'quiz',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    total_points: 100
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    school_id: '11111111-1111-1111-1111-111111111111',
    course_id: 'c1111111-1111-1111-1111-111111111111',
    title: 'Build a Personal Website',
    description: 'Create a responsive personal portfolio website',
    type: 'project',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    total_points: 200
  }
];

for (const assessment of assessments) {
  const { error } = await supabase
    .from('assessments')
    .upsert(assessment, { onConflict: 'id' });

  if (error) {
    console.log(`   ❌ ${assessment.title}: ${error.message}`);
    results.errors.push({ table: 'assessments', error: error.message });
  } else {
    console.log(`   ✅ ${assessment.title}`);
    results.assessments++;
  }
}

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '═'.repeat(70));
console.log('\n📊 SEEDING SUMMARY:\n');
console.log(`   🏫 Schools:       ${results.schools}`);
console.log(`   📝 Sections:      ${results.sections}`);
console.log(`   👤 Profiles:      ${results.profiles}`);
console.log(`   🎓 Students:      ${results.students}`);
console.log(`   📚 Courses:       ${results.courses}`);
console.log(`   ✏️  Enrollments:   ${results.enrollments}`);
console.log(`   📦 Modules:       ${results.modules}`);
console.log(`   📖 Lessons:       ${results.lessons}`);
console.log(`   📝 Assessments:   ${results.assessments}`);

if (results.errors.length > 0) {
  console.log(`\n   ❌ Errors:        ${results.errors.length}`);
  console.log('\n   Error details:');
  results.errors.forEach(e => {
    console.log(`      - ${e.table}: ${e.error}`);
  });
}

console.log('\n' + '═'.repeat(70));
console.log('✅ Seeding complete!\n');
