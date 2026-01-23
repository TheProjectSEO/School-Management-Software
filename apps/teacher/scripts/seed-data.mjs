#!/usr/bin/env node

/**
 * Comprehensive Seed Data Script for MSU School OS
 * Connects teacher-app and student-app data
 * Schema: "public" (CRITICAL)
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
const TEACHER_EMAIL = 'juan.delacruz@msu.edu.ph';
const TEACHER_FULL_NAME = 'Dr. Juan Dela Cruz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STUDENT_NAMES = [
  'Juan Santos', 'Maria Garcia', 'Carlos Reyes', 'Ana Fernandez',
  'Miguel Dela Cruz', 'Rosa Montoya', 'Luis Gonzales', 'Filipina Ramos'
];

const COURSES_BY_GRADE = {
  '10': [
    { name: 'Mathematics 101', code: 'MATH101', desc: 'Introduction to Algebra and Functions' },
    { name: 'Physics 101', code: 'PHYS101', desc: 'Fundamentals of Mechanics and Motion' },
    { name: 'English 101', code: 'ENG101', desc: 'Communication and Literature' }
  ],
  '11': [
    { name: 'Mathematics 201', code: 'MATH201', desc: 'Advanced Algebra and Trigonometry' },
    { name: 'Chemistry 101', code: 'CHEM101', desc: 'Basic Chemistry and Atomic Structure' }
  ],
  '12': [
    { name: 'Advanced Physics', code: 'PHYS201', desc: 'Advanced Mechanics and Thermodynamics' }
  ]
};

const MODULE_TEMPLATES = {
  'Mathematics': ['Introduction to Algebra', 'Linear Equations', 'Polynomials'],
  'Physics': ['Motion and Forces', 'Energy and Work'],
  'Chemistry': ['Atomic Structure', 'Chemical Bonding'],
  'English': ['Creative Writing', 'Literary Analysis']
};

const LESSON_TEMPLATES = [
  ['Introduction and Overview', 'Core Concepts', 'Practice Problems'],
  ['Fundamentals', 'Advanced Topics', 'Real-world Applications'],
  ['Getting Started', 'Deep Dive', 'Review and Practice']
];

let stats = {
  sections: 0, courses: 0, assignments: 0, students: 0,
  enrollments: 0, modules: 0, lessons: 0
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${level}: ${message}`);
}

async function main() {
  try {
    log('Starting MSU School OS Seed Data Generation\n', 'START');

    // Step 1: Get teacher profile
    log('Step 1: Fetching teacher profile...');
    const { data: teacherProfiles } = await supabase
      .from('teacher_profiles')
      .select('id, school_id')
      .eq('school_id', SCHOOL_ID)
      .limit(1);

    if (!teacherProfiles || teacherProfiles.length === 0) {
      throw new Error('Teacher profile not found');
    }

    const teacherProfileId = teacherProfiles[0].id;
    log(`Found teacher profile: ${teacherProfileId}`, 'SUCCESS');

    // Step 2: Create sections
    log('\nStep 2: Creating class sections...');
    const sections = [
      { name: 'Grade 10 - Einstein', grade_level: '10' },
      { name: 'Grade 11 - Newton', grade_level: '11' },
      { name: 'Grade 12 - Curie', grade_level: '12' }
    ];

    const sectionIds = [];
    for (const section of sections) {
      const { data, error } = await supabase
        .from('sections')
        .insert([{
          school_id: SCHOOL_ID,
          name: section.name,
          grade_level: section.grade_level,
          adviser_teacher_id: null
        }])
        .select('id');

      if (error) throw error;
      sectionIds.push(data[0].id);
      stats.sections++;
      log(`  ✅ Created: ${section.name}`);
    }

    // Step 3: Create courses
    log('\nStep 3: Creating courses...');
    const coursesBySection = {};

    for (const sectionId of sectionIds) {
      const { data: sectionData } = await supabase
        .from('sections')
        .select('grade_level')
        .eq('id', sectionId)
        .single();

      const gradeLevel = sectionData.grade_level;
      const courses = COURSES_BY_GRADE[gradeLevel] || [];
      coursesBySection[sectionId] = [];

      for (const course of courses) {
        const { data, error } = await supabase
          .from('courses')
          .insert([{
            school_id: SCHOOL_ID,
            section_id: sectionId,
            name: course.name,
            subject_code: course.code,
            description: course.desc,
            teacher_id: teacherProfileId
          }])
          .select('id');

        if (error) throw error;
        coursesBySection[sectionId].push(data[0].id);
        stats.courses++;
        log(`  ✅ Created: ${course.name}`);
      }
    }

    // Step 4: Create teacher assignments
    log('\nStep 4: Creating teacher assignments...');
    for (const [sectionId, courseIds] of Object.entries(coursesBySection)) {
      for (const courseId of courseIds) {
        const { error } = await supabase
          .from('teacher_assignments')
          .insert([{
            teacher_profile_id: teacherProfileId,
            section_id: sectionId,
            course_id: courseId,
            is_primary: true
          }]);

        if (error && !error.message.includes('duplicate')) throw error;
        stats.assignments++;
      }
    }
    log(`  ✅ Created ${stats.assignments} assignments`, 'SUCCESS');

    // Step 5: Create students
    log('\nStep 5: Creating student accounts...');
    const studentIds = [];
    const enrollmentList = [];
    let studentCounter = 0;

    for (const sectionId of sectionIds) {
      const { data: sectionData } = await supabase
        .from('sections')
        .select('grade_level')
        .eq('id', sectionId)
        .single();

      const gradeLevel = sectionData.grade_level;
      const studentsPerSection = 6;

      for (let i = 0; i < studentsPerSection; i++) {
        const studentName = STUDENT_NAMES[studentCounter % STUDENT_NAMES.length];
        const lrn = String(Math.floor(100000000000 + Math.random() * 900000000000));

        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            auth_user_id: crypto.randomUUID(),
            full_name: `${studentName} (${i + 1})`
          }])
          .select('id');

        if (profileError) throw profileError;
        const profileId = profileData[0].id;

        // Create student record
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .insert([{
            school_id: SCHOOL_ID,
            profile_id: profileId,
            lrn: lrn,
            grade_level: gradeLevel,
            section_id: sectionId
          }])
          .select('id');

        if (studentError) throw studentError;
        const studentId = studentData[0].id;
        studentIds.push({ id: studentId, sectionId });
        stats.students++;
        log(`  ✅ Created student: ${studentName}`);

        // Track enrollments
        for (const courseId of coursesBySection[sectionId]) {
          enrollmentList.push({ schoolId: SCHOOL_ID, studentId, courseId });
        }

        studentCounter++;
      }
    }

    // Step 6: Create enrollments
    log('\nStep 6: Creating enrollments...');
    for (const enrollment of enrollmentList) {
      const { error } = await supabase
        .from('enrollments')
        .insert([{
          school_id: enrollment.schoolId,
          student_id: enrollment.studentId,
          course_id: enrollment.courseId
        }]);

      if (error && !error.message.includes('duplicate')) throw error;
      stats.enrollments++;
    }
    log(`  ✅ Created ${stats.enrollments} enrollments`, 'SUCCESS');

    // Step 7: Create modules
    log('\nStep 7: Creating modules...');
    const moduleIds = [];

    for (const courseIds of Object.values(coursesBySection)) {
      for (const courseId of courseIds) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('name')
          .eq('id', courseId)
          .single();

        const courseName = courseData.name;
        let templates = [];

        for (const [key, mods] of Object.entries(MODULE_TEMPLATES)) {
          if (courseName.includes(key)) {
            templates = mods;
            break;
          }
        }

        if (templates.length === 0) templates = ['Module 1', 'Module 2'];

        for (let i = 0; i < templates.length; i++) {
          const { data, error } = await supabase
            .from('modules')
            .insert([{
              course_id: courseId,
              title: templates[i],
              description: `Learn about ${templates[i].toLowerCase()}`,
              order: i + 1,
              duration_minutes: 45,
              is_published: true
            }])
            .select('id');

          if (error) throw error;
          moduleIds.push(data[0].id);
          stats.modules++;
          log(`  ✅ Created module: ${templates[i]}`);
        }
      }
    }

    // Step 8: Create lessons
    log('\nStep 8: Creating lessons...');
    const contentTypes = ['video', 'reading', 'quiz'];

    for (let idx = 0; idx < moduleIds.length; idx++) {
      const moduleId = moduleIds[idx];
      const lessons = LESSON_TEMPLATES[idx % LESSON_TEMPLATES.length];

      for (let i = 0; i < lessons.length; i++) {
        const { error } = await supabase
          .from('lessons')
          .insert([{
            module_id: moduleId,
            title: lessons[i],
            content: `Complete lesson content for ${lessons[i]}`,
            content_type: contentTypes[i % contentTypes.length],
            duration_minutes: 15,
            order: i + 1,
            is_published: true
          }]);

        if (error) throw error;
        stats.lessons++;
        log(`  ✅ Created lesson: ${lessons[i]}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ SEED DATA GENERATION COMPLETE\n');
    console.log('📊 SUMMARY:');
    console.log(`  • Sections Created: ${stats.sections}`);
    console.log(`  • Courses Created: ${stats.courses}`);
    console.log(`  • Teacher Assignments: ${stats.assignments}`);
    console.log(`  • Students Created: ${stats.students}`);
    console.log(`  • Enrollments Created: ${stats.enrollments}`);
    console.log(`  • Modules Created: ${stats.modules}`);
    console.log(`  • Lessons Created: ${stats.lessons}`);
    console.log('\n🔑 VERIFICATION:');
    console.log(`  ✅ Teacher Profile ID: ${teacherProfileId}`);
    console.log(`  ✅ Section IDs: ${sectionIds.join(', ')}`);
    console.log(`  ✅ Total Courses: ${stats.courses}`);
    console.log('\n✅ Data is ready for testing across teacher-app and student-app!');
    console.log('='.repeat(60));

  } catch (error) {
    log(`ERROR: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

main();
