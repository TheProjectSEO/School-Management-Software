#!/usr/bin/env node

/**
 * Simple Database Population Script
 * Populates the database using Supabase client insert operations
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Known IDs
const SCHOOL_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_PROFILE_ID = '44d7c894-d749-4e15-be1b-f42afe6f8c27';
const STUDENT_ID = '44444444-4444-4444-4444-444444444444';

async function populateDatabase() {
  console.log('🚀 Starting database population...\n');

  try {
    // 1. Create School
    console.log('📚 Creating school...');
    const { error: schoolError } = await supabase
      .from('schools')
      .upsert({
        id: SCHOOL_ID,
        slug: 'manila-central-high',
        name: 'Manila Central High School',
        region: 'National Capital Region',
        division: 'Manila Division',
        accent_color: '#7B1113'
      });

    if (schoolError) {
      console.error('❌ School creation error:', schoolError.message);
    } else {
      console.log('✅ School created\n');
    }

    // 2. Create Sections
    console.log('🏫 Creating sections...');
    const sections = [
      { id: '22222221-2222-2222-2222-222222222221', name: 'Section A - Einstein', grade_level: 'Grade 7' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Section B - Newton', grade_level: 'Grade 8' },
      { id: '22222223-2222-2222-2222-222222222223', name: 'Section A - Galileo', grade_level: 'Grade 9' },
      { id: '22222224-2222-2222-2222-222222222224', name: 'Section B - Curie', grade_level: 'Grade 10' },
      { id: '22222225-2222-2222-2222-222222222225', name: 'Section A - Darwin', grade_level: 'Grade 11' },
      { id: '22222226-2222-2222-2222-222222222226', name: 'Section B - Tesla', grade_level: 'Grade 12' }
    ];

    for (const section of sections) {
      const { error } = await supabase.from('sections').upsert({
        ...section,
        school_id: SCHOOL_ID
      });
      if (error) console.error(`  ❌ ${section.name}:`, error.message);
      else console.log(`  ✅ ${section.name}`);
    }
    console.log('');

    // 3. Create Courses
    console.log('📖 Creating courses...');
    const courses = [
      {
        id: '33333331-3333-3333-3333-333333333331',
        name: 'Advanced Mathematics',
        subject_code: 'MATH-401',
        description: 'Calculus, Trigonometry, and Advanced Algebra for Grade 11',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333332-3333-3333-3333-333333333332',
        name: 'Geometry & Statistics',
        subject_code: 'MATH-301',
        description: 'Advanced Geometry and Introduction to Statistics',
        section_id: '22222224-2222-2222-2222-222222222224'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Physics',
        subject_code: 'SCI-401',
        description: 'Classical Mechanics, Electricity, and Magnetism',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333334-3333-3333-3333-333333333334',
        name: 'Chemistry',
        subject_code: 'SCI-402',
        description: 'Organic Chemistry, Chemical Reactions, and Laboratory Techniques',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333335-3333-3333-3333-333333333335',
        name: 'Biology',
        subject_code: 'SCI-301',
        description: 'Cell Biology, Genetics, and Human Anatomy',
        section_id: '22222224-2222-2222-2222-222222222224'
      },
      {
        id: '33333336-3333-3333-3333-333333333336',
        name: 'English Literature',
        subject_code: 'ENG-401',
        description: 'World Literature, Literary Analysis, and Creative Writing',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333337-3333-3333-3333-333333333337',
        name: 'Filipino',
        subject_code: 'FIL-401',
        description: 'Panitikan ng Pilipinas at Sining ng Pagsulat',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333338-3333-3333-3333-333333333338',
        name: 'Philippine History',
        subject_code: 'HIST-401',
        description: 'From Pre-Colonial Era to Modern Philippines',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333339-3333-3333-3333-333333333339',
        name: 'World History',
        subject_code: 'HIST-402',
        description: 'Ancient Civilizations to Contemporary Global Issues',
        section_id: '22222225-2222-2222-2222-222222222225'
      },
      {
        id: '33333340-3333-3333-3333-333333333340',
        name: 'Computer Programming',
        subject_code: 'CS-401',
        description: 'Introduction to Python, Web Development, and Algorithms',
        section_id: '22222225-2222-2222-2222-222222222225'
      }
    ];

    for (const course of courses) {
      const { error } = await supabase.from('courses').upsert({
        ...course,
        school_id: SCHOOL_ID,
        teacher_id: 'teacher-' + course.subject_code.split('-')[0].toLowerCase()
      });
      if (error) console.error(`  ❌ ${course.name}:`, error.message);
      else console.log(`  ✅ ${course.name}`);
    }
    console.log('');

    // 4. Create Student Record
    console.log('👨‍🎓 Creating student record...');
    const { error: studentError } = await supabase
      .from('students')
      .upsert({
        id: STUDENT_ID,
        school_id: SCHOOL_ID,
        profile_id: STUDENT_PROFILE_ID,
        lrn: 'LRN-2024-001234',
        grade_level: 'Grade 11',
        section_id: '22222225-2222-2222-2222-222222222225'
      });

    if (studentError) {
      console.error('❌ Student creation error:', studentError.message);
    } else {
      console.log('✅ Student created\n');
    }

    // 5. Enroll Student in Courses
    console.log('📝 Enrolling student in courses...');
    const enrollments = [
      '33333331-3333-3333-3333-333333333331', // Math
      '33333333-3333-3333-3333-333333333333', // Physics
      '33333334-3333-3333-3333-333333333334', // Chemistry
      '33333336-3333-3333-3333-333333333336', // English
      '33333337-3333-3333-3333-333333333337', // Filipino
      '33333338-3333-3333-3333-333333333338', // Philippine History
      '33333339-3333-3333-3333-333333333339', // World History
      '33333340-3333-3333-3333-333333333340'  // Computer Programming
    ];

    for (const courseId of enrollments) {
      const { error } = await supabase.from('enrollments').upsert({
        school_id: SCHOOL_ID,
        student_id: STUDENT_ID,
        course_id: courseId
      }, {
        onConflict: 'student_id,course_id'
      });
      if (error) console.error(`  ❌ Enrollment error:`, error.message);
      else console.log(`  ✅ Enrolled in course ${courseId.substring(0, 13)}...`);
    }
    console.log('');

    // 6. Create Modules
    console.log('📚 Creating modules...');
    const modules = [
      // Math modules
      { course_id: '33333331-3333-3333-3333-333333333331', title: 'Introduction to Calculus', description: 'Limits, Derivatives, and Basic Integration', order: 1, duration_minutes: 120 },
      { course_id: '33333331-3333-3333-3333-333333333331', title: 'Advanced Trigonometry', description: 'Trigonometric Identities and Applications', order: 2, duration_minutes: 90 },

      // Physics modules
      { course_id: '33333333-3333-3333-3333-333333333333', title: 'Mechanics Fundamentals', description: 'Newton\'s Laws, Forces, and Motion', order: 1, duration_minutes: 110 },
      { course_id: '33333333-3333-3333-3333-333333333333', title: 'Energy and Work', description: 'Kinetic Energy, Potential Energy, and Conservation Laws', order: 2, duration_minutes: 95 },

      // Chemistry modules
      { course_id: '33333334-3333-3333-3333-333333333334', title: 'Organic Chemistry Introduction', description: 'Hydrocarbons and Functional Groups', order: 1, duration_minutes: 100 },
      { course_id: '33333334-3333-3333-3333-333333333334', title: 'Chemical Reactions', description: 'Types of Reactions and Balancing Equations', order: 2, duration_minutes: 90 },

      // English modules
      { course_id: '33333336-3333-3333-3333-333333333336', title: 'Introduction to Literary Analysis', description: 'Understanding Themes, Symbols, and Character Development', order: 1, duration_minutes: 85 },

      // Filipino modules
      { course_id: '33333337-3333-3333-3333-333333333337', title: 'Panitikang Pilipino', description: 'Alamat, Tula, at Maikling Kwento', order: 1, duration_minutes: 80 },

      // History modules
      { course_id: '33333338-3333-3333-3333-333333333338', title: 'Pre-Colonial Philippines', description: 'Ancient Civilizations and Trade', order: 1, duration_minutes: 90 },

      // Computer Programming modules
      { course_id: '33333340-3333-3333-3333-333333333340', title: 'Python Basics', description: 'Variables, Data Types, and Control Structures', order: 1, duration_minutes: 100 }
    ];

    const { data: createdModules, error: modulesError } = await supabase
      .from('modules')
      .insert(modules)
      .select();

    if (modulesError) {
      console.error('❌ Modules creation error:', modulesError.message);
    } else {
      console.log(`✅ Created ${createdModules.length} modules\n`);
    }

    // 7. Create some Assessments
    console.log('📝 Creating assessments...');
    const assessments = [
      {
        school_id: SCHOOL_ID,
        course_id: '33333331-3333-3333-3333-333333333331',
        title: 'Calculus Quiz 1',
        description: 'Test your understanding of limits and derivatives',
        type: 'quiz',
        total_points: 50
      },
      {
        school_id: SCHOOL_ID,
        course_id: '33333333-3333-3333-3333-333333333333',
        title: 'Newton\'s Laws Quiz',
        description: 'Short quiz on the three laws of motion',
        type: 'quiz',
        total_points: 30
      },
      {
        school_id: SCHOOL_ID,
        course_id: '33333340-3333-3333-3333-333333333340',
        title: 'Python Basics Quiz',
        description: 'Test your knowledge of Python fundamentals',
        type: 'quiz',
        total_points: 45
      }
    ];

    const { data: createdAssessments, error: assessmentsError } = await supabase
      .from('assessments')
      .insert(assessments)
      .select();

    if (assessmentsError) {
      console.error('❌ Assessments creation error:', assessmentsError.message);
    } else {
      console.log(`✅ Created ${createdAssessments.length} assessments\n`);
    }

    // 8. Create Notifications
    console.log('🔔 Creating notifications...');
    const notifications = [
      {
        student_id: STUDENT_ID,
        type: 'info',
        title: 'Welcome to Manila Central High School',
        message: 'Welcome to the student portal! Start exploring your courses.',
        is_read: true
      },
      {
        student_id: STUDENT_ID,
        type: 'assignment',
        title: 'New Assignment Posted',
        message: 'Your teacher has posted a new assignment in Physics',
        is_read: false
      },
      {
        student_id: STUDENT_ID,
        type: 'warning',
        title: 'Assignment Due Soon',
        message: 'Reminder: Calculus Quiz 1 is due in 7 days',
        is_read: false
      }
    ];

    const { data: createdNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (notificationsError) {
      console.error('❌ Notifications creation error:', notificationsError.message);
    } else {
      console.log(`✅ Created ${createdNotifications.length} notifications\n`);
    }

    // 9. Create Notes
    console.log('📓 Creating notes...');
    const notes = [
      {
        student_id: STUDENT_ID,
        course_id: '33333331-3333-3333-3333-333333333331',
        title: 'Math Study Notes',
        content: 'Remember: The derivative of x^2 is 2x. Practice more problems!',
        type: 'note',
        is_favorite: true
      },
      {
        student_id: STUDENT_ID,
        course_id: '33333333-3333-3333-3333-333333333333',
        title: 'Physics Formulas',
        content: 'F=ma, KE=1/2mv², PE=mgh - Remember these key formulas!',
        type: 'note',
        is_favorite: true
      }
    ];

    const { data: createdNotes, error: notesError } = await supabase
      .from('notes')
      .insert(notes)
      .select();

    if (notesError) {
      console.error('❌ Notes creation error:', notesError.message);
    } else {
      console.log(`✅ Created ${createdNotes.length} notes\n`);
    }

    console.log('='.repeat(60));
    console.log('🎉 DATABASE POPULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log('   ✅ 1 School created');
    console.log('   ✅ 6 Sections created');
    console.log('   ✅ 10 Courses created');
    console.log('   ✅ 1 Student created and enrolled in 8 courses');
    console.log('   ✅ Multiple modules, assessments, notifications, and notes added');
    console.log('');
    console.log('🎯 Student dashboard is now fully populated!');
    console.log('👨‍🎓 Student Profile ID: ' + STUDENT_PROFILE_ID);
    console.log('📚 Student can now access all courses and content!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

populateDatabase();
