-- Direct SQL Script to Populate Communication Data
-- Run this in Supabase SQL Editor

-- First, check if we have a student
DO $$
DECLARE
  v_student_id UUID;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Get first student (or create demo if needed)
  SELECT id INTO v_student_id FROM students LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'No student found. Please create a student first by signing up at student@msu.edu.ph';
    RETURN;
  END IF;

  RAISE NOTICE 'Using student ID: %', v_student_id;

  -- Create announcements table if not exists
  CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'reminder', 'general')) DEFAULT 'general',
    priority TEXT NOT NULL CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments_json JSONB,
    is_pinned BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Clear existing announcements for fresh start
  DELETE FROM announcements WHERE school_id = v_school_id;

  -- Insert 15 diverse announcements
  INSERT INTO announcements (school_id, course_id, section_id, type, priority, title, message, published_at) VALUES

  -- Course: Web Development
  (v_school_id, 'c1111111-1111-1111-1111-111111111111', v_section_id, 'assignment', 'urgent',
   '⚠️ Assignment Reminder: Portfolio Project Due Soon',
   'This is a reminder that your Personal Portfolio project is due in 3 days. Please make sure to: 1) Include all required pages, 2) Ensure responsive design, 3) Submit GitHub link, 4) Deploy to Netlify/Vercel',
   NOW() - INTERVAL '2 hours'),

  (v_school_id, 'c1111111-1111-1111-1111-111111111111', v_section_id, 'general', 'normal',
   '🎯 New Learning Resources Added',
   'I have added new supplementary resources: JavaScript ES6+ Cheat Sheet, Interactive CodePen exercises, YouTube channel recommendations, and a free eBook "You Don''t Know JS".',
   NOW() - INTERVAL '3 days'),

  (v_school_id, 'c1111111-1111-1111-1111-111111111111', v_section_id, 'reminder', 'normal',
   '🎨 Responsive Design Workshop This Saturday',
   'Weekend workshop on Responsive Web Design! Saturday 9 AM-12 PM in Computer Lab 3. Topics: Media queries, Mobile-first design, CSS Grid/Flexbox, Testing. Bring your laptops! Coffee provided.',
   NOW() - INTERVAL '9 days'),

  -- Course: Data Structures
  (v_school_id, 'c2222222-2222-2222-2222-222222222222', v_section_id, 'reminder', 'normal',
   '🔔 Lab Session Tomorrow - Stack Implementation',
   'Lab session tomorrow for Stack data structure. Review: Stack operations (push, pop, peek, isEmpty), Array vs Linked-list implementation, Time complexity. Bring laptops with IDE ready!',
   NOW() - INTERVAL '5 hours'),

  (v_school_id, 'c2222222-2222-2222-2222-222222222222', v_section_id, 'assignment', 'urgent',
   '💻 Coding Assignment: Implement Stack Operations',
   'Stack implementation assignment posted! Due in 7 days. Requirements: Stack class with push/pop/peek/isEmpty/size methods, test cases, comments, time complexity analysis. Submit GitHub link.',
   NOW() - INTERVAL '6 hours'),

  -- Course: Philippine History
  (v_school_id, 'c3333333-3333-3333-3333-333333333333', v_section_id, 'reminder', 'normal',
   '📚 Essay Submission Guidelines',
   'Pre-Colonial Era Essay due next week. Format: 5-7 pages, double-spaced, Times New Roman 12pt, APA citation, min 5 sources. Content: Introduction, Political structure, Economy, Culture, Conclusion.',
   NOW() - INTERVAL '4 days'),

  (v_school_id, 'c3333333-3333-3333-3333-333333333333', v_section_id, 'exam', 'urgent',
   '📖 Reading Materials for Next Week Quiz',
   'Quiz next class on Spanish Colonial Period! Required: Chapter 4 (Galleon Trade), Chapter 5 (Colonial Society), Supplementary article (Impact of Catholicism). Format: 10 MC, 5 ID, 2 Short answer. 30 minutes.',
   NOW() - INTERVAL '5 days'),

  -- Course: Calculus
  (v_school_id, 'c4444444-4444-4444-4444-444444444444', v_section_id, 'exam', 'urgent',
   '📝 Midterm Exam Schedule - Derivatives',
   'Midterm exam scheduled! Topics: Derivative rules, Applications, Related rates, Optimization. Allowed: Scientific calculator (non-graphing). Bring student ID. Room 301, Math Building, 1-3 PM.',
   NOW() - INTERVAL '1 day'),

  (v_school_id, 'c4444444-4444-4444-4444-444444444444', v_section_id, 'general', 'normal',
   '📊 Office Hours Schedule Update',
   'Office hours: Monday 10 AM-12 PM, Wednesday 2-4 PM, Friday 10-11:30 AM. Location: Faculty Room 204, Math Building. Available for homework, exam prep, concept clarification.',
   NOW() - INTERVAL '7 days'),

  -- Course: English
  (v_school_id, 'c5555555-5555-5555-5555-555555555555', v_section_id, 'general', 'normal',
   '✍️ Guest Speaker: Technical Writer from Microsoft',
   'Special guest lecture! Maria Santos, Senior Technical Writer at Microsoft Philippines. Topic: Career Paths in Technical Communication. She will share journey, best practices, portfolio tips, Q&A. Auditorium Hall A, 2-4 PM. Highly encouraged!',
   NOW() - INTERVAL '2 days'),

  (v_school_id, 'c5555555-5555-5555-5555-555555555555', v_section_id, 'general', 'normal',
   '📝 Peer Review Sessions Next Week',
   'Peer review sessions for Technical Report drafts. Groups A/B/C on Mon/Tue/Wed 1-2:30 PM. Bring: 3 printed copies, rubric (provided), pen/highlighter. Get feedback from 2 classmates. Check email for groups.',
   NOW() - INTERVAL '12 days'),

  -- School-wide announcements
  (v_school_id, NULL, NULL, 'general', 'urgent',
   '🎉 University Foundation Day Celebration',
   'MSU Foundation Day coming up! Activities: 8 AM Opening, 9 AM Symposium, 12 PM Cultural, 2 PM Sports, 5 PM Awarding, 7 PM Concert. All classes suspended. Participate in activities!',
   NOW() - INTERVAL '3 hours'),

  (v_school_id, NULL, NULL, 'general', 'normal',
   '📅 Academic Calendar - Midterm Break',
   'Midterm Break schedule. Submit all requirements before break. Library limited hours 9 AM-5 PM. No faculty consultations during break. Emergency contacts active. Enjoy and stay safe!',
   NOW() - INTERVAL '1 day'),

  (v_school_id, NULL, NULL, 'general', 'urgent',
   '🔐 Student Portal Maintenance Schedule',
   'IMPORTANT: Portal maintenance scheduled. Date: 2 days from now, 11 PM-3 AM. Affected: Grade viewing, Course enrollment, Document requests, Payment. Email remains operational. Complete urgent transactions before maintenance.',
   NOW() - INTERVAL '8 hours'),

  (v_school_id, NULL, NULL, 'reminder', 'normal',
   '📋 Final Exam Period Approaching',
   'Finals begin in 3 weeks. Check exam schedules, review materials, attend review sessions, settle finances, bring ID. Library extended hours during finals: Mon-Fri 7 AM-10 PM, Sat-Sun 8 AM-8 PM. Good luck!',
   NOW() - INTERVAL '4 days');

  RAISE NOTICE 'Created 15 announcements';

  -- Clear existing notifications for fresh start
  DELETE FROM notifications WHERE student_id = v_student_id;

  -- Insert notifications
  INSERT INTO notifications (student_id, type, title, message, is_read, action_url, created_at) VALUES

  -- Assignment reminders (unread)
  (v_student_id, 'assignment', '⏰ Assignment Due Soon: Portfolio Project',
   'Your Personal Portfolio project is due in 3 days. Make sure to submit before the deadline!',
   false, '/assessments/a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 hours'),

  (v_student_id, 'assignment', '📝 New Assignment: Stack Implementation',
   'A new coding assignment has been posted in Data Structures. Due in 7 days.',
   false, '/assessments/a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 hours'),

  -- Grade notifications (mixed)
  (v_student_id, 'grade', '✅ Grade Posted: HTML Fundamentals Quiz',
   'Your grade for the HTML Fundamentals Quiz has been posted. Score: 45/50 (90%)',
   true, '/grades', NOW() - INTERVAL '5 days'),

  (v_student_id, 'grade', '✅ Grade Posted: Arrays and Lists Quiz',
   'Your grade for the Arrays and Lists Quiz has been posted. Score: 38/40 (95%)',
   false, '/grades', NOW() - INTERVAL '1 day'),

  -- Announcement notifications
  (v_student_id, 'announcement', '📢 New: Midterm Exam Schedule',
   'Your Calculus teacher has posted an important announcement about the midterm exam.',
   false, '/announcements', NOW() - INTERVAL '1 day'),

  (v_student_id, 'announcement', '📢 New: Lab Session Tomorrow',
   'Reminder about the Data Structures lab session. Check the announcement for details.',
   true, '/announcements', NOW() - INTERVAL '5 hours'),

  (v_student_id, 'announcement', '📢 School-wide: Foundation Day',
   'MSU Foundation Day is coming up! Check out the schedule of activities.',
   false, '/announcements', NOW() - INTERVAL '3 hours'),

  -- Info notifications
  (v_student_id, 'info', '📚 New learning resources added',
   'Your Web Development teacher has added new supplementary materials. Check them out!',
   false, '/subjects/c1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days'),

  -- Warning notification
  (v_student_id, 'warning', '⚠️ Multiple Assignments Due This Week',
   'You have 3 assignments due this week. Check your schedule and plan accordingly.',
   false, '/assessments', NOW() - INTERVAL '1 hour'),

  -- Success notification
  (v_student_id, 'success', '🎉 Assignment Submitted Successfully',
   'Your submission for "Pre-Colonial Era Essay" has been received.',
   true, '/assessments/a3333333-3333-3333-3333-333333333331', NOW() - INTERVAL '8 days'),

  -- Error notification
  (v_student_id, 'error', '❌ Payment Verification Required',
   'Your enrollment for next semester requires payment verification. Please visit the Cashier''s Office.',
   false, '/profile', NOW() - INTERVAL '12 hours');

  RAISE NOTICE 'Created 11 notifications';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Communication data populated successfully!';
  RAISE NOTICE 'Announcements: 15 (11 course-specific + 4 school-wide)';
  RAISE NOTICE 'Notifications: 11 (7 unread, 4 read)';

END $$;
