-- ============================================================================
-- POPULATE COMMUNICATION DATA FOR STUDENT APP
-- Description: Creates announcements, notifications, and messages
-- Schema: "school software" (public schema)
-- ============================================================================

-- Get the school ID
DO $$
DECLARE
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  v_section_id UUID := '22222222-2222-2222-2222-222222222222';
  v_course_web_dev UUID := 'c1111111-1111-1111-1111-111111111111';
  v_course_data_structures UUID := 'c2222222-2222-2222-2222-222222222222';
  v_course_ph_history UUID := 'c3333333-3333-3333-3333-333333333333';
  v_course_calculus UUID := 'c4444444-4444-4444-4444-444444444444';
  v_course_english UUID := 'c5555555-5555-5555-5555-555555555555';
  v_student_id UUID;
BEGIN

  -- Get the first student ID (will be used for notifications and messages)
  SELECT id INTO v_student_id FROM students WHERE school_id = v_school_id LIMIT 1;

  -- If no student exists yet, we'll still create the data structure
  IF v_student_id IS NULL THEN
    RAISE NOTICE 'No student found yet. Some data will be created without student association.';
  END IF;

  -- ============================================================================
  -- 1. CREATE TEACHER ANNOUNCEMENTS
  -- ============================================================================

  -- ASSIGNMENT TYPE - Web Development (URGENT)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_web_dev, v_section_id,
    'assignment', 'urgent',
    '⚠️ Assignment Reminder: Portfolio Project Due Soon',
    'This is a reminder that your Personal Portfolio project is due in 3 days. Please make sure to:\n\n1. Include all required pages (Home, About, Projects, Contact)\n2. Ensure responsive design works on mobile devices\n3. Submit the GitHub repository link\n4. Deploy to Netlify or Vercel\n\nIf you have any questions, please ask during office hours or post in the discussion forum.',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  );

  -- EXAM TYPE - Calculus (URGENT)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_calculus, v_section_id,
    'exam', 'urgent',
    '📝 Midterm Exam Schedule - Derivatives',
    'Your midterm exam on Derivatives is scheduled for next week:\n\n📅 Date: ' || TO_CHAR(NOW() + INTERVAL '21 days', 'MMMM DD, YYYY') || '\n⏰ Time: 1:00 PM - 3:00 PM\n📍 Location: Room 301, Math Building\n\nTopics covered:\n• Derivative rules (power, product, quotient, chain)\n• Applications of derivatives\n• Related rates\n• Optimization problems\n\nAllowed materials: Scientific calculator (non-graphing)\nPlease bring your student ID.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  );

  -- REMINDER TYPE - Data Structures (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_data_structures, v_section_id,
    'reminder', 'normal',
    '🔔 Lab Session Tomorrow - Stack Implementation',
    'Reminder: We have our lab session tomorrow where we will implement a Stack data structure from scratch.\n\nPlease review:\n- Stack operations (push, pop, peek, isEmpty)\n- Array-based vs Linked-list implementation\n- Time complexity analysis\n\nBring your laptops with your preferred IDE ready. We will be coding together!',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '5 hours'
  );

  -- GENERAL TYPE - Web Development (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_web_dev, v_section_id,
    'general', 'normal',
    '🎯 New Learning Resources Added',
    'I''ve added new supplementary resources to help you with the JavaScript module:\n\n• JavaScript ES6+ Cheat Sheet (PDF)\n• Interactive Coding Exercises on CodePen\n• Recommended YouTube channels for practice\n• Free eBook: "You Don''t Know JS"\n\nAll resources are available in the Resources section of our course. Happy learning!',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  );

  -- REMINDER TYPE - Philippine History (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_ph_history, v_section_id,
    'reminder', 'normal',
    '📚 Essay Submission Guidelines',
    'For your Pre-Colonial Era Essay due next week:\n\n📄 Format Requirements:\n- 5-7 pages, double-spaced\n- Times New Roman, 12pt font\n- APA citation format\n- Minimum 5 scholarly sources\n\n✍️ Content Requirements:\n- Introduction to pre-colonial Filipino society\n- Political structure (barangays, datus)\n- Economic systems and trade\n- Cultural practices and beliefs\n- Conclusion with historical significance\n\nSubmit as PDF through the assignment portal. Late submissions will be penalized 10 points per day.',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  );

  -- GENERAL TYPE - English (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_english, v_section_id,
    'general', 'normal',
    '✍️ Guest Speaker Next Week: Technical Writer from Microsoft',
    'We are excited to announce a special guest lecture next week!\n\n🎤 Speaker: Maria Santos, Senior Technical Writer at Microsoft Philippines\n📅 Date: ' || TO_CHAR(NOW() + INTERVAL '6 days', 'MMMM DD, YYYY') || '\n⏰ Time: 2:00 PM - 4:00 PM\n📍 Venue: Auditorium Hall A\n\nTopic: "Career Paths in Technical Communication"\n\nMaria will share:\n- Her journey into technical writing\n- Industry best practices\n- Portfolio building tips\n- Q&A session\n\nAttendance is optional but highly encouraged! This is a great networking opportunity.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

  -- ASSIGNMENT TYPE - Data Structures (URGENT)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_data_structures, v_section_id,
    'assignment', 'urgent',
    '💻 Coding Assignment: Implement Stack Operations',
    'Your stack implementation assignment has been posted!\n\nDue: ' || TO_CHAR(NOW() + INTERVAL '7 days', 'MMMM DD, YYYY HH24:MI') || '\n\nRequirements:\n✅ Implement Stack class with the following methods:\n   - push(item)\n   - pop()\n   - peek()\n   - isEmpty()\n   - size()\n\n✅ Include comprehensive test cases\n✅ Add comments explaining your code\n✅ Calculate and document time complexity\n\nSubmit your code on GitHub and paste the repository link in the assignment portal. Code must compile and run without errors.',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  );

  -- GENERAL TYPE - Calculus (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_calculus, v_section_id,
    'general', 'normal',
    '📊 Office Hours Schedule Update',
    'My office hours for this week have been updated:\n\n🕐 Monday: 10:00 AM - 12:00 PM\n🕐 Wednesday: 2:00 PM - 4:00 PM\n🕐 Friday: 10:00 AM - 11:30 AM\n\n📍 Location: Faculty Room 204, Math Building\n\nFeel free to drop by if you need help with:\n- Homework problems\n- Exam preparation\n- Concept clarification\n- General math questions\n\nYou can also email me to schedule an appointment outside these hours if needed.',
    NOW() - INTERVAL '1 week',
    NOW() - INTERVAL '1 week'
  );

  -- REMINDER TYPE - Web Development (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_web_dev, v_section_id,
    'reminder', 'normal',
    '🎨 Responsive Design Workshop This Saturday',
    'Don''t forget about our weekend workshop on Responsive Web Design!\n\n📅 Date: This Saturday\n⏰ Time: 9:00 AM - 12:00 PM\n📍 Venue: Computer Lab 3\n\nWhat we''ll cover:\n• Media queries in depth\n• Mobile-first design approach\n• CSS Grid and Flexbox for layouts\n• Testing responsive designs\n• Live coding session\n\nBring your laptops! Coffee and snacks will be provided. ☕\n\nRSVP by tomorrow so we can prepare enough materials.',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '9 days'
  );

  -- EXAM TYPE - Philippine History (URGENT)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_ph_history, v_section_id,
    'exam', 'urgent',
    '📖 Reading Materials for Next Week Quiz',
    'Quiz alert! We will have a short quiz next class on the Spanish Colonial Period.\n\n📚 Required Readings:\n- Chapter 4: "The Galleon Trade" (pages 78-95)\n- Chapter 5: "Colonial Society and Culture" (pages 96-112)\n- Supplementary article: "Impact of Catholicism in the Philippines" (uploaded to course materials)\n\nQuiz Format:\n• 10 multiple choice questions\n• 5 identification items\n• 2 short answer questions\n\nDuration: 30 minutes\nDate: Next class session\n\nPlease come prepared!',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  );

  -- GENERAL TYPE - English (NORMAL)
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, v_course_english, v_section_id,
    'general', 'normal',
    '📝 Peer Review Sessions Next Week',
    'We will conduct peer review sessions for your Technical Report drafts next week.\n\nSchedule:\n• Group A: Monday, 1:00 PM - 2:30 PM\n• Group B: Tuesday, 1:00 PM - 2:30 PM\n• Group C: Wednesday, 1:00 PM - 2:30 PM\n\nPlease bring:\n✓ Printed copy of your draft (3 copies)\n✓ Peer review rubric (will be provided)\n✓ Pen/highlighter for annotations\n\nYou will receive feedback from 2 classmates. This is a great opportunity to improve your work before final submission!\n\nCheck your email for group assignments.',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
  );

  -- ============================================================================
  -- 2. CREATE SCHOOL-WIDE SYSTEM ANNOUNCEMENTS
  -- ============================================================================

  -- School event
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, NULL, NULL,
    'general', 'urgent',
    '🎉 University Foundation Day Celebration',
    '🎊 MSU Foundation Day is coming up!\n\n📅 Date: ' || TO_CHAR(NOW() + INTERVAL '15 days', 'MMMM DD, YYYY') || '\n\nSchedule of Activities:\n\n8:00 AM - Opening Ceremony\n9:00 AM - Academic Symposium\n12:00 PM - Cultural Presentations\n2:00 PM - Sports Festival\n5:00 PM - Awarding Ceremony\n7:00 PM - Foundation Day Concert\n\nAll classes are suspended on this day. Students are encouraged to participate in the activities!\n\nFor more details, visit the Student Affairs Office or check the university website.',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  );

  -- Holiday announcement
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, NULL, NULL,
    'general', 'normal',
    '📅 Academic Calendar Update - Midterm Break',
    'Reminder: Midterm Break Schedule\n\n🏖️ No Classes:\n' || TO_CHAR(NOW() + INTERVAL '30 days', 'MMMM DD') || ' - ' || TO_CHAR(NOW() + INTERVAL '35 days', 'MMMM DD, YYYY') || '\n\nClasses resume: ' || TO_CHAR(NOW() + INTERVAL '36 days', 'MMMM DD, YYYY') || '\n\nImportant Notes:\n• Submit all pending requirements before the break\n• Library will have limited hours (9 AM - 5 PM)\n• No faculty consultations during break\n• Emergency contacts remain active\n\nEnjoy your break and stay safe! 🌴',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  );

  -- Administrative message
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, NULL, NULL,
    'general', 'urgent',
    '🔐 Student Portal Maintenance Schedule',
    'IMPORTANT: The Student Portal will undergo scheduled maintenance.\n\n🛠️ Maintenance Window:\n📅 Date: ' || TO_CHAR(NOW() + INTERVAL '2 days', 'MMMM DD, YYYY') || '\n⏰ Time: 11:00 PM - 3:00 AM\n\nAffected Services:\n❌ Grade viewing\n❌ Course enrollment\n❌ Document requests\n❌ Payment processing\n\n✅ Email system will remain operational\n\nPlease plan accordingly and complete any urgent transactions before the maintenance window.\n\nWe apologize for any inconvenience.\n\n- IT Services Team',
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '8 hours'
  );

  -- Important date reminder
  INSERT INTO announcements (
    school_id, course_id, section_id,
    type, priority, title, message,
    published_at, created_at
  ) VALUES (
    v_school_id, NULL, NULL,
    'reminder', 'normal',
    '📋 Final Exam Period Approaching',
    'Final examinations are scheduled to begin in 3 weeks.\n\n📚 Final Exam Period:\n' || TO_CHAR(NOW() + INTERVAL '21 days', 'MMMM DD') || ' - ' || TO_CHAR(NOW() + INTERVAL '28 days', 'MMMM DD, YYYY') || '\n\nReminder:\n• Check your individual exam schedules in the portal\n• Review class materials and notes\n• Attend review sessions organized by departments\n• Settle any financial obligations before exams\n• Bring valid ID to all examinations\n\n📖 The library will extend hours during finals week:\nMon-Fri: 7:00 AM - 10:00 PM\nSat-Sun: 8:00 AM - 8:00 PM\n\nGood luck with your studies! 💪',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  );

  -- ============================================================================
  -- 3. CREATE NOTIFICATIONS FOR STUDENTS
  -- ============================================================================

  IF v_student_id IS NOT NULL THEN

    -- Welcome notification (already read)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'info',
      '👋 Welcome to MSU Student Portal!',
      'Start your learning journey today. Check out your enrolled subjects and begin watching lessons.',
      true, '/subjects',
      NOW() - INTERVAL '7 days'
    );

    -- Assignment due reminders (urgent, unread)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'assignment',
      '⏰ Assignment Due Soon: Portfolio Project',
      'Your Personal Portfolio project is due in 3 days. Make sure to submit before the deadline!',
      false, '/assessments/a1111111-1111-1111-1111-111111111112',
      NOW() - INTERVAL '2 hours'
    );

    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'assignment',
      '📝 New Assignment Posted: Stack Implementation',
      'A new coding assignment has been posted in Data Structures. Due in 7 days.',
      false, '/assessments/a2222222-2222-2222-2222-222222222222',
      NOW() - INTERVAL '6 hours'
    );

    -- Grade posted notifications (some read, some unread)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'grade',
      '✅ Grade Posted: HTML Fundamentals Quiz',
      'Your grade for the HTML Fundamentals Quiz has been posted. Score: 45/50 (90%)',
      true, '/grades',
      NOW() - INTERVAL '5 days'
    );

    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'grade',
      '✅ Grade Posted: Arrays and Lists Quiz',
      'Your grade for the Arrays and Lists Quiz has been posted. Score: 38/40 (95%)',
      false, '/grades',
      NOW() - INTERVAL '1 day'
    );

    -- Announcement notifications (mix of read/unread)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'announcement',
      '📢 New Announcement: Midterm Exam Schedule',
      'Your Calculus teacher has posted an important announcement about the midterm exam.',
      false, '/announcements',
      NOW() - INTERVAL '1 day'
    );

    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'announcement',
      '📢 New Announcement: Lab Session Tomorrow',
      'Reminder about the Data Structures lab session. Check the announcement for details.',
      true, '/announcements',
      NOW() - INTERVAL '5 hours'
    );

    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'announcement',
      '📢 School-wide: Foundation Day Celebration',
      'MSU Foundation Day is coming up! Check out the schedule of activities.',
      false, '/announcements',
      NOW() - INTERVAL '3 hours'
    );

    -- Info notifications (tips and reminders)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'info',
      '💡 Pro tip: Download lessons for offline viewing',
      'You can download video lessons to watch offline. Go to Downloads to manage your offline content.',
      true, '/downloads',
      NOW() - INTERVAL '6 days'
    );

    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'info',
      '📚 New learning resources added',
      'Your Web Development teacher has added new supplementary materials. Check them out!',
      false, '/subjects/c1111111-1111-1111-1111-111111111111',
      NOW() - INTERVAL '3 days'
    );

    -- Warning notification
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'warning',
      '⚠️ Multiple Assignments Due This Week',
      'You have 3 assignments due this week. Check your schedule and plan accordingly.',
      false, '/assessments',
      NOW() - INTERVAL '1 hour'
    );

    -- Success notification (read)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'success',
      '🎉 Assignment Submitted Successfully',
      'Your submission for "Pre-Colonial Era Essay" has been received.',
      true, '/assessments/a3333333-3333-3333-3333-333333333331',
      NOW() - INTERVAL '8 days'
    );

    -- Error notification (urgent, unread)
    INSERT INTO notifications (
      student_id, type, title, message, is_read, action_url, created_at
    ) VALUES (
      v_student_id, 'error',
      '❌ Payment Verification Required',
      'Your enrollment for next semester requires payment verification. Please visit the Cashier''s Office.',
      false, '/profile',
      NOW() - INTERVAL '12 hours'
    );

  END IF;

  RAISE NOTICE 'Communication data population completed successfully!';
  RAISE NOTICE 'Created: 11 course announcements, 4 school-wide announcements, 13 notifications';

END $$;
