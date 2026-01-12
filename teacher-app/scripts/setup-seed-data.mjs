#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://qyjzqzqqjimittltttph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o';

const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';
const TEACHER_FULL_NAME = 'Dr. Juan Dela Cruz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STUDENT_NAMES = ['Juan Santos', 'Maria Garcia', 'Carlos Reyes', 'Ana Fernandez', 'Miguel Dela Cruz', 'Rosa Montoya'];

const COURSES_BY_GRADE = {
  '10': [
    { name: 'Mathematics 101', code: 'MATH101', desc: 'Introduction to Algebra and Functions' },
    { name: 'Physics 101', code: 'PHYS101', desc: 'Fundamentals of Mechanics' },
    { name: 'English 101', code: 'ENG101', desc: 'Communication and Literature' }
  ],
  '11': [
    { name: 'Mathematics 201', code: 'MATH201', desc: 'Advanced Algebra and Trigonometry' },
    { name: 'Chemistry 101', code: 'CHEM101', desc: 'Basic Chemistry' }
  ],
  '12': [
    { name: 'Advanced Physics', code: 'PHYS201', desc: 'Advanced Mechanics' }
  ]
};

let stats = {
  sections: 0, courses: 0, assignments: 0,
  students: 0, enrollments: 0, modules: 0, lessons: 0
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${level}: ${message}`);
}

async function getOrCreateTeacherProfile() {
  log('Step 1: Getting teacher profile...');

  const existing = await supabase.from('teacher_profiles').select('id').eq('school_id', SCHOOL_ID).limit(1);

  if (existing.data && existing.data.length > 0) {
    const teacherId = existing.data[0].id;
    log(`  ✅ Found existing teacher profile: ${teacherId}`, 'SUCCESS');
    return teacherId;
  }

  throw new Error('No teacher profile found. Please create teacher profile first.');
}

async function createSections() {
  log('\nStep 2: Creating class sections...');
  const sections = [
    { name: 'Grade 10 - Einstein', grade_level: '10' },
    { name: 'Grade 11 - Newton', grade_level: '11' },
    { name: 'Grade 12 - Curie', grade_level: '12' }
  ];

  const sectionIds = [];
  for (const section of sections) {
    const result = await supabase.from('sections').insert([{
      school_id: SCHOOL_ID,
      name: section.name,
      grade_level: section.grade_level
    }]).select('id');

    if (result.error) {
      if (result.error.message.includes('duplicate')) {
        log(`  ℹ️ Section already exists: ${section.name}`);
        const existing = await supabase.from('sections').select('id').eq('school_id', SCHOOL_ID).eq('name', section.name).single();
        if (existing.data) {
          sectionIds.push(existing.data.id);
        }
      } else {
        throw new Error(`Failed to create section: ${result.error.message}`);
      }
    } else {
      sectionIds.push(result.data[0].id);
      stats.sections++;
      log(`  ✅ Created: ${section.name}`);
    }
  }

  return sectionIds;
}

async function createCourses(sectionIds, teacherProfileId) {
  log('\nStep 3: Creating courses...');
  const coursesBySection = {};

  for (const sectionId of sectionIds) {
    const sectionData = await supabase.from('sections').select('grade_level').eq('id', sectionId).single();
    const gradeLevel = sectionData.data.grade_level;
    const courses = COURSES_BY_GRADE[gradeLevel] || [];
    coursesBySection[sectionId] = [];

    for (const course of courses) {
      const result = await supabase.from('courses').insert([{
        school_id: SCHOOL_ID,
        section_id: sectionId,
        name: course.name,
        subject_code: course.code,
        description: course.desc,
        teacher_id: teacherProfileId
      }]).select('id');

      if (result.error) {
        if (result.error.message.includes('duplicate')) {
          log(`  ℹ️ Course already exists: ${course.name}`);
          const existing = await supabase.from('courses').select('id').eq('section_id', sectionId).eq('name', course.name).single();
          if (existing.data) coursesBySection[sectionId].push(existing.data.id);
        } else {
          throw new Error(`Failed to create course: ${result.error.message}`);
        }
      } else {
        coursesBySection[sectionId].push(result.data[0].id);
        stats.courses++;
        log(`  ✅ Created: ${course.name}`);
      }
    }
  }

  return coursesBySection;
}

async function createTeacherAssignments(coursesBySection, teacherProfileId) {
  log('\nStep 4: Creating teacher assignments...');

  for (const [sectionId, courseIds] of Object.entries(coursesBySection)) {
    for (const courseId of courseIds) {
      const result = await supabase.from('teacher_assignments').insert([{
        teacher_profile_id: teacherProfileId,
        section_id: sectionId,
        course_id: courseId,
        is_primary: true
      }]);

      if (result.error && !result.error.message.includes('duplicate')) {
        throw new Error(`Failed to create assignment: ${result.error.message}`);
      }
      stats.assignments++;
    }
  }
  log(`  ✅ Created ${stats.assignments} assignments`, 'SUCCESS');
}

async function createStudents(sectionIds) {
  log('\nStep 5: Creating student accounts...');
  const studentIds = [];
  const enrollmentList = [];
  let studentCounter = 0;

  for (const sectionId of sectionIds) {
    const sectionData = await supabase.from('sections').select('grade_level').eq('id', sectionId).single();
    const gradeLevel = sectionData.data.grade_level;

    for (let i = 0; i < 6; i++) {
      const studentName = STUDENT_NAMES[studentCounter % STUDENT_NAMES.length];
      const lrn = String(Math.floor(100000000000 + Math.random() * 900000000000));

      const profileResult = await supabase.from('profiles').insert([{
        auth_user_id: randomUUID(),
        full_name: `${studentName} (${i + 1})`
      }]).select('id');

      if (profileResult.error) throw new Error(`Failed to create student profile: ${profileResult.error.message}`);
      const profileId = profileResult.data[0].id;

      const studentResult = await supabase.from('students').insert([{
        school_id: SCHOOL_ID,
        profile_id: profileId,
        lrn: lrn,
        grade_level: gradeLevel,
        section_id: sectionId
      }]).select('id');

      if (studentResult.error) throw new Error(`Failed to create student: ${studentResult.error.message}`);
      const studentId = studentResult.data[0].id;
      studentIds.push({ id: studentId, sectionId });
      stats.students++;
      log(`  ✅ Created student: ${studentName}`);

      const sectionCourses = await supabase.from('courses').select('id').eq('section_id', sectionId);
      if (sectionCourses.data) {
        for (const course of sectionCourses.data) {
          enrollmentList.push({ schoolId: SCHOOL_ID, studentId, courseId: course.id });
        }
      }

      studentCounter++;
    }
  }

  return { studentIds, enrollmentList };
}

async function createEnrollments(enrollmentList) {
  log('\nStep 6: Creating enrollments...');
  for (const enrollment of enrollmentList) {
    const result = await supabase.from('enrollments').insert([{
      school_id: enrollment.schoolId,
      student_id: enrollment.studentId,
      course_id: enrollment.courseId
    }]);

    if (result.error && !result.error.message.includes('duplicate')) {
      throw new Error(`Failed to create enrollment: ${result.error.message}`);
    }
    stats.enrollments++;
  }
  log(`  ✅ Created ${stats.enrollments} enrollments`, 'SUCCESS');
}

async function createModules(coursesBySection) {
  log('\nStep 7: Creating modules...');
  const moduleIds = [];

  const moduleTemplates = {
    'Math': ['Introduction to Algebra', 'Linear Equations'],
    'Physics': ['Motion and Forces', 'Energy'],
    'Chemistry': ['Atomic Structure', 'Bonding'],
    'English': ['Writing', 'Analysis']
  };

  for (const courseIds of Object.values(coursesBySection)) {
    for (const courseId of courseIds) {
      const courseData = await supabase.from('courses').select('name').eq('id', courseId).single();
      const courseName = courseData.data.name;

      let templates = [];
      if (courseName.includes('Math')) templates = moduleTemplates.Math;
      else if (courseName.includes('Physics')) templates = moduleTemplates.Physics;
      else if (courseName.includes('Chemistry')) templates = moduleTemplates.Chemistry;
      else if (courseName.includes('English')) templates = moduleTemplates.English;
      else templates = ['Module 1', 'Module 2'];

      for (let i = 0; i < templates.length; i++) {
        const result = await supabase.from('modules').insert([{
          course_id: courseId,
          title: templates[i],
          description: `Learn about ${templates[i].toLowerCase()}`,
          order: i + 1,
          duration_minutes: 45,
          is_published: true
        }]).select('id');

        if (result.error) throw new Error(`Failed to create module: ${result.error.message}`);
        moduleIds.push(result.data[0].id);
        stats.modules++;
        log(`  ✅ Created module: ${templates[i]}`);
      }
    }
  }

  return moduleIds;
}

async function createLessons(moduleIds) {
  log('\nStep 8: Creating lessons...');
  const contentTypes = ['video', 'reading', 'quiz'];
  const lessonTemplates = ['Overview', 'Core Content', 'Practice'];

  for (let idx = 0; idx < moduleIds.length; idx++) {
    const moduleId = moduleIds[idx];

    for (let i = 0; i < lessonTemplates.length; i++) {
      const result = await supabase.from('lessons').insert([{
        module_id: moduleId,
        title: lessonTemplates[i],
        content: `Complete lesson content for ${lessonTemplates[i]}`,
        content_type: contentTypes[i % contentTypes.length],
        duration_minutes: 15,
        order: i + 1,
        is_published: true
      }]);

      if (result.error) throw new Error(`Failed to create lesson: ${result.error.message}`);
      stats.lessons++;
      log(`  ✅ Created lesson: ${lessonTemplates[i]}`);
    }
  }
}

async function main() {
  try {
    log('Starting MSU School OS Comprehensive Seed\n', 'START');

    const teacherProfileId = await getOrCreateTeacherProfile();
    const sectionIds = await createSections();
    const coursesBySection = await createCourses(sectionIds, teacherProfileId);
    await createTeacherAssignments(coursesBySection, teacherProfileId);
    const { studentIds, enrollmentList } = await createStudents(sectionIds);
    await createEnrollments(enrollmentList);
    const moduleIds = await createModules(coursesBySection);
    await createLessons(moduleIds);

    console.log('\n' + '='.repeat(70));
    console.log('✨ COMPREHENSIVE SEED DATA GENERATION COMPLETE\n');
    console.log('📊 SUMMARY:');
    console.log(`  • Teacher Profile ID: ${teacherProfileId}`);
    console.log(`  • Sections Created: ${stats.sections}`);
    console.log(`  • Courses Created: ${stats.courses}`);
    console.log(`  • Teacher Assignments: ${stats.assignments}`);
    console.log(`  • Students Created: ${stats.students}`);
    console.log(`  • Enrollments Created: ${stats.enrollments}`);
    console.log(`  • Modules Created: ${stats.modules}`);
    console.log(`  • Lessons Created: ${stats.lessons}`);
    console.log('\n🎯 TOTAL INTERCONNECTED DATA POINTS: ${(stats.sections + stats.courses + stats.assignments + stats.students + stats.enrollments + stats.modules + stats.lessons)}');
    console.log('\n✅ Complete data structure is ready!');
    console.log('   - Teacher can see 3 sections with ' + stats.courses + ' total courses');
    console.log('   - ' + stats.students + ' students distributed across ' + stats.sections + ' sections');
    console.log('   - ' + stats.courses + ' courses with ' + stats.modules + ' modules containing ' + stats.lessons + ' lessons');
    console.log('   - Students can view published content in student-app');
    console.log('   - Teacher can manage content in teacher-app');
    console.log('='.repeat(70));

  } catch (error) {
    log(`ERROR: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

main();
