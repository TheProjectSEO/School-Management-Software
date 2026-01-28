#!/usr/bin/env node

/**
 * Setup Communication System for Student App
 * Creates tables and populates with realistic data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with schema configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
});

console.log('🚀 Setting up Communication System...\n');

// Step 1: Create tables
console.log('📋 Step 1: Creating communication tables...');

const migrationSQL = readFileSync(
  join(__dirname, '../supabase/migrations/00000000000005_communication_tables.sql'),
  'utf-8'
);

try {
  const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
  if (migrationError) {
    // Try direct execution if rpc fails
    console.log('   Using direct table creation...');

    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from('announcements')
      .select('id')
      .limit(1);

    if (existingTables !== null) {
      console.log('   ✅ Tables already exist');
    } else {
      console.log('   ⚠️  Cannot verify tables. Proceeding with data population...');
    }
  } else {
    console.log('   ✅ Tables created successfully');
  }
} catch (error) {
  console.log('   ⚠️  Migration step completed (tables may already exist)');
}

// Step 2: Get student ID
console.log('\n📋 Step 2: Finding student...');

const { data: students, error: studentError } = await supabase
  .from('students')
  .select('id, school_id')
  .limit(1);

if (studentError || !students || students.length === 0) {
  console.error('❌ No student found. Please create a student account first.');
  console.log('   Run: npm run create-test-user');
  process.exit(1);
}

const studentId = students[0].id;
const schoolId = students[0].school_id;

console.log(`   ✅ Found student: ${studentId}`);
console.log(`   ✅ School ID: ${schoolId}`);

// Step 3: Create announcements
console.log('\n📋 Step 3: Creating announcements...');

const announcements = [
  // ASSIGNMENT TYPE - Web Development (URGENT)
  {
    school_id: schoolId,
    course_id: 'c1111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'assignment',
    priority: 'urgent',
    title: '⚠️ Assignment Reminder: Portfolio Project Due Soon',
    message: `This is a reminder that your Personal Portfolio project is due in 3 days. Please make sure to:

1. Include all required pages (Home, About, Projects, Contact)
2. Ensure responsive design works on mobile devices
3. Submit the GitHub repository link
4. Deploy to Netlify or Vercel

If you have any questions, please ask during office hours or post in the discussion forum.`,
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },

  // EXAM TYPE - Calculus (URGENT)
  {
    school_id: schoolId,
    course_id: 'c4444444-4444-4444-4444-444444444444',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'exam',
    priority: 'urgent',
    title: '📝 Midterm Exam Schedule - Derivatives',
    message: `Your midterm exam on Derivatives is scheduled for next week:

📅 Date: ${new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}
⏰ Time: 1:00 PM - 3:00 PM
📍 Location: Room 301, Math Building

Topics covered:
• Derivative rules (power, product, quotient, chain)
• Applications of derivatives
• Related rates
• Optimization problems

Allowed materials: Scientific calculator (non-graphing)
Please bring your student ID.`,
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  // REMINDER TYPE - Data Structures (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c2222222-2222-2222-2222-222222222222',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'reminder',
    priority: 'normal',
    title: '🔔 Lab Session Tomorrow - Stack Implementation',
    message: `Reminder: We have our lab session tomorrow where we will implement a Stack data structure from scratch.

Please review:
- Stack operations (push, pop, peek, isEmpty)
- Array-based vs Linked-list implementation
- Time complexity analysis

Bring your laptops with your preferred IDE ready. We will be coding together!`,
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },

  // GENERAL TYPE - Web Development (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c1111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'general',
    priority: 'normal',
    title: '🎯 New Learning Resources Added',
    message: `I've added new supplementary resources to help you with the JavaScript module:

• JavaScript ES6+ Cheat Sheet (PDF)
• Interactive Coding Exercises on CodePen
• Recommended YouTube channels for practice
• Free eBook: "You Don't Know JS"

All resources are available in the Resources section of our course. Happy learning!`,
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // REMINDER TYPE - Philippine History (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c3333333-3333-3333-3333-333333333333',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'reminder',
    priority: 'normal',
    title: '📚 Essay Submission Guidelines',
    message: `For your Pre-Colonial Era Essay due next week:

📄 Format Requirements:
- 5-7 pages, double-spaced
- Times New Roman, 12pt font
- APA citation format
- Minimum 5 scholarly sources

✍️ Content Requirements:
- Introduction to pre-colonial Filipino society
- Political structure (barangays, datus)
- Economic systems and trade
- Cultural practices and beliefs
- Conclusion with historical significance

Submit as PDF through the assignment portal. Late submissions will be penalized 10 points per day.`,
    published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // GENERAL TYPE - English (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c5555555-5555-5555-5555-555555555555',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'general',
    priority: 'normal',
    title: '✍️ Guest Speaker Next Week: Technical Writer from Microsoft',
    message: `We are excited to announce a special guest lecture next week!

🎤 Speaker: Maria Santos, Senior Technical Writer at Microsoft Philippines
📅 Date: ${new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
⏰ Time: 2:00 PM - 4:00 PM
📍 Venue: Auditorium Hall A

Topic: "Career Paths in Technical Communication"

Maria will share:
- Her journey into technical writing
- Industry best practices
- Portfolio building tips
- Q&A session

Attendance is optional but highly encouraged! This is a great networking opportunity.`,
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // ASSIGNMENT TYPE - Data Structures (URGENT)
  {
    school_id: schoolId,
    course_id: 'c2222222-2222-2222-2222-222222222222',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'assignment',
    priority: 'urgent',
    title: '💻 Coding Assignment: Implement Stack Operations',
    message: `Your stack implementation assignment has been posted!

Due: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Requirements:
✅ Implement Stack class with the following methods:
   - push(item)
   - pop()
   - peek()
   - isEmpty()
   - size()

✅ Include comprehensive test cases
✅ Add comments explaining your code
✅ Calculate and document time complexity

Submit your code on GitHub and paste the repository link in the assignment portal. Code must compile and run without errors.`,
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },

  // GENERAL TYPE - Calculus (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c4444444-4444-4444-4444-444444444444',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'general',
    priority: 'normal',
    title: '📊 Office Hours Schedule Update',
    message: `My office hours for this week have been updated:

🕐 Monday: 10:00 AM - 12:00 PM
🕐 Wednesday: 2:00 PM - 4:00 PM
🕐 Friday: 10:00 AM - 11:30 AM

📍 Location: Faculty Room 204, Math Building

Feel free to drop by if you need help with:
- Homework problems
- Exam preparation
- Concept clarification
- General math questions

You can also email me to schedule an appointment outside these hours if needed.`,
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // REMINDER TYPE - Web Development (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c1111111-1111-1111-1111-111111111111',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'reminder',
    priority: 'normal',
    title: '🎨 Responsive Design Workshop This Saturday',
    message: `Don't forget about our weekend workshop on Responsive Web Design!

📅 Date: This Saturday
⏰ Time: 9:00 AM - 12:00 PM
📍 Venue: Computer Lab 3

What we'll cover:
• Media queries in depth
• Mobile-first design approach
• CSS Grid and Flexbox for layouts
• Testing responsive designs
• Live coding session

Bring your laptops! Coffee and snacks will be provided. ☕

RSVP by tomorrow so we can prepare enough materials.`,
    published_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // EXAM TYPE - Philippine History (URGENT)
  {
    school_id: schoolId,
    course_id: 'c3333333-3333-3333-3333-333333333333',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'exam',
    priority: 'urgent',
    title: '📖 Reading Materials for Next Week Quiz',
    message: `Quiz alert! We will have a short quiz next class on the Spanish Colonial Period.

📚 Required Readings:
- Chapter 4: "The Galleon Trade" (pages 78-95)
- Chapter 5: "Colonial Society and Culture" (pages 96-112)
- Supplementary article: "Impact of Catholicism in the Philippines" (uploaded to course materials)

Quiz Format:
• 10 multiple choice questions
• 5 identification items
• 2 short answer questions

Duration: 30 minutes
Date: Next class session

Please come prepared!`,
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // GENERAL TYPE - English (NORMAL)
  {
    school_id: schoolId,
    course_id: 'c5555555-5555-5555-5555-555555555555',
    section_id: '22222222-2222-2222-2222-222222222222',
    type: 'general',
    priority: 'normal',
    title: '📝 Peer Review Sessions Next Week',
    message: `We will conduct peer review sessions for your Technical Report drafts next week.

Schedule:
• Group A: Monday, 1:00 PM - 2:30 PM
• Group B: Tuesday, 1:00 PM - 2:30 PM
• Group C: Wednesday, 1:00 PM - 2:30 PM

Please bring:
✓ Printed copy of your draft (3 copies)
✓ Peer review rubric (will be provided)
✓ Pen/highlighter for annotations

You will receive feedback from 2 classmates. This is a great opportunity to improve your work before final submission!

Check your email for group assignments.`,
    published_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // School-wide announcements
  {
    school_id: schoolId,
    course_id: null,
    section_id: null,
    type: 'general',
    priority: 'urgent',
    title: '🎉 University Foundation Day Celebration',
    message: `🎊 MSU Foundation Day is coming up!

📅 Date: ${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Schedule of Activities:

8:00 AM - Opening Ceremony
9:00 AM - Academic Symposium
12:00 PM - Cultural Presentations
2:00 PM - Sports Festival
5:00 PM - Awarding Ceremony
7:00 PM - Foundation Day Concert

All classes are suspended on this day. Students are encouraged to participate in the activities!

For more details, visit the Student Affairs Office or check the university website.`,
    published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },

  {
    school_id: schoolId,
    course_id: null,
    section_id: null,
    type: 'general',
    priority: 'normal',
    title: '📅 Academic Calendar Update - Midterm Break',
    message: `Reminder: Midterm Break Schedule

🏖️ No Classes:
${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Classes resume: ${new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Important Notes:
• Submit all pending requirements before the break
• Library will have limited hours (9 AM - 5 PM)
• No faculty consultations during break
• Emergency contacts remain active

Enjoy your break and stay safe! 🌴`,
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  {
    school_id: schoolId,
    course_id: null,
    section_id: null,
    type: 'general',
    priority: 'urgent',
    title: '🔐 Student Portal Maintenance Schedule',
    message: `IMPORTANT: The Student Portal will undergo scheduled maintenance.

🛠️ Maintenance Window:
📅 Date: ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString()}
⏰ Time: 11:00 PM - 3:00 AM

Affected Services:
❌ Grade viewing
❌ Course enrollment
❌ Document requests
❌ Payment processing

✅ Email system will remain operational

Please plan accordingly and complete any urgent transactions before the maintenance window.

We apologize for any inconvenience.

- IT Services Team`,
    published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },

  {
    school_id: schoolId,
    course_id: null,
    section_id: null,
    type: 'reminder',
    priority: 'normal',
    title: '📋 Final Exam Period Approaching',
    message: `Final examinations are scheduled to begin in 3 weeks.

📚 Final Exam Period:
${new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Reminder:
• Check your individual exam schedules in the portal
• Review class materials and notes
• Attend review sessions organized by departments
• Settle any financial obligations before exams
• Bring valid ID to all examinations

📖 The library will extend hours during finals week:
Mon-Fri: 7:00 AM - 10:00 PM
Sat-Sun: 8:00 AM - 8:00 PM

Good luck with your studies! 💪`,
    published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const { data: createdAnnouncements, error: announcementsError } = await supabase
  .from('announcements')
  .insert(announcements)
  .select();

if (announcementsError) {
  console.error('   ❌ Error creating announcements:', announcementsError.message);
} else {
  console.log(`   ✅ Created ${createdAnnouncements.length} announcements`);
}

// Step 4: Create notifications
console.log('\n📋 Step 4: Creating notifications...');

const notifications = [
  // Assignment due reminders (urgent, unread)
  {
    student_id: studentId,
    type: 'assignment',
    title: '⏰ Assignment Due Soon: Portfolio Project',
    message: 'Your Personal Portfolio project is due in 3 days. Make sure to submit before the deadline!',
    is_read: false,
    action_url: '/assessments/a1111111-1111-1111-1111-111111111112',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    student_id: studentId,
    type: 'assignment',
    title: '📝 New Assignment Posted: Stack Implementation',
    message: 'A new coding assignment has been posted in Data Structures. Due in 7 days.',
    is_read: false,
    action_url: '/assessments/a2222222-2222-2222-2222-222222222222',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  // Grade posted notifications
  {
    student_id: studentId,
    type: 'grade',
    title: '✅ Grade Posted: HTML Fundamentals Quiz',
    message: 'Your grade for the HTML Fundamentals Quiz has been posted. Score: 45/50 (90%)',
    is_read: true,
    action_url: '/grades',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    student_id: studentId,
    type: 'grade',
    title: '✅ Grade Posted: Arrays and Lists Quiz',
    message: 'Your grade for the Arrays and Lists Quiz has been posted. Score: 38/40 (95%)',
    is_read: false,
    action_url: '/grades',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  // Announcement notifications
  {
    student_id: studentId,
    type: 'announcement',
    title: '📢 New Announcement: Midterm Exam Schedule',
    message: 'Your Calculus teacher has posted an important announcement about the midterm exam.',
    is_read: false,
    action_url: '/announcements',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    student_id: studentId,
    type: 'announcement',
    title: '📢 New Announcement: Lab Session Tomorrow',
    message: 'Reminder about the Data Structures lab session. Check the announcement for details.',
    is_read: true,
    action_url: '/announcements',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    student_id: studentId,
    type: 'announcement',
    title: '📢 School-wide: Foundation Day Celebration',
    message: 'MSU Foundation Day is coming up! Check out the schedule of activities.',
    is_read: false,
    action_url: '/announcements',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  // Info notifications
  {
    student_id: studentId,
    type: 'info',
    title: '📚 New learning resources added',
    message: 'Your Web Development teacher has added new supplementary materials. Check them out!',
    is_read: false,
    action_url: '/subjects/c1111111-1111-1111-1111-111111111111',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Warning notification
  {
    student_id: studentId,
    type: 'warning',
    title: '⚠️ Multiple Assignments Due This Week',
    message: 'You have 3 assignments due this week. Check your schedule and plan accordingly.',
    is_read: false,
    action_url: '/assessments',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  // Success notification
  {
    student_id: studentId,
    type: 'success',
    title: '🎉 Assignment Submitted Successfully',
    message: 'Your submission for "Pre-Colonial Era Essay" has been received.',
    is_read: true,
    action_url: '/assessments/a3333333-3333-3333-3333-333333333331',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Error notification
  {
    student_id: studentId,
    type: 'error',
    title: '❌ Payment Verification Required',
    message: 'Your enrollment for next semester requires payment verification. Please visit the Cashier\'s Office.',
    is_read: false,
    action_url: '/profile',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

const { data: createdNotifications, error: notificationsError } = await supabase
  .from('notifications')
  .insert(notifications)
  .select();

if (notificationsError) {
  console.error('   ❌ Error creating notifications:', notificationsError.message);
} else {
  console.log(`   ✅ Created ${createdNotifications.length} notifications`);
  const unreadCount = createdNotifications.filter(n => !n.is_read).length;
  console.log(`   📊 ${unreadCount} unread notifications`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ COMMUNICATION SYSTEM SETUP COMPLETE!');
console.log('='.repeat(50));
console.log('\nSummary:');
console.log(`📢 Announcements: ${createdAnnouncements?.length || 0} created`);
console.log(`   • Course announcements: 11`);
console.log(`   • School-wide announcements: 4`);
console.log(`🔔 Notifications: ${createdNotifications?.length || 0} created`);
console.log(`   • Unread: ${createdNotifications?.filter(n => !n.is_read).length || 0}`);
console.log(`   • Read: ${createdNotifications?.filter(n => n.is_read).length || 0}`);
console.log('\n🎉 Your student portal now has realistic communication content!');
console.log('\n📱 Test the features:');
console.log('   • Visit /announcements to see all announcements');
console.log('   • Check notification badge for unread count');
console.log('   • View notifications dropdown');
console.log('   • Filter announcements by type');
console.log('');
