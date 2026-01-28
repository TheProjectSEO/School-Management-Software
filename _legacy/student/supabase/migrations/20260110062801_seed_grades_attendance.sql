-- ============================================
-- SEED DATA FOR GRADES AND ATTENDANCE
-- Populates realistic grade and attendance records
-- ============================================

-- ============================================
-- 1. CREATE GRADING PERIODS
-- ============================================
INSERT INTO grading_periods (id, school_id, name, academic_year, start_date, end_date, is_active) VALUES
-- Fall 2024 (Current Semester)
('gp111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'First Semester 2024-2025', '2024-2025', '2024-08-15', '2024-12-20', true),

-- Midterm Fall 2024
('gp111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'Midterm - First Semester 2024-2025', '2024-2025', '2024-08-15', '2024-10-15', false),

-- Spring 2024 (Previous Semester)
('gp111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111',
 'Second Semester 2023-2024', '2023-2024', '2024-01-08', '2024-05-25', false),

-- Fall 2023
('gp111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111',
 'First Semester 2023-2024', '2023-2024', '2023-08-20', '2023-12-18', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. FUNCTION TO CREATE GRADE AND ATTENDANCE DATA
-- This will be called when a student is created
-- ============================================
CREATE OR REPLACE FUNCTION create_grades_attendance_data(p_student_id UUID, p_school_id UUID)
RETURNS void AS $$
DECLARE
  v_course RECORD;
  v_period RECORD;
  v_date DATE;
  v_days_back INTEGER;
BEGIN
  -- ==========================================
  -- CREATE COURSE GRADES
  -- ==========================================

  -- Fall 2024 - Midterm Grades (Released)
  -- Web Development: A (92%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c1111111-1111-1111-1111-111111111111',
    'gp111111-1111-1111-1111-111111111112',
    'A', 92.00, 92.00, 3.00, 12.00,
    'released', true,
    'Excellent work on HTML/CSS projects. Shows strong understanding of responsive design principles.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Data Structures: B+ (88%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c2222222-2222-2222-2222-222222222222',
    'gp111111-1111-1111-1111-111111111112',
    'B+', 88.00, 88.00, 3.00, 10.50,
    'released', true,
    'Good grasp of arrays and linked lists. Need more practice with tree algorithms.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Philippine History: A- (90%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c3333333-3333-3333-3333-333333333333',
    'gp111111-1111-1111-1111-111111111112',
    'A-', 90.00, 90.00, 3.00, 11.25,
    'released', true,
    'Thoughtful essays and strong participation in discussions.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Calculus I: B (85%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c4444444-4444-4444-4444-444444444444',
    'gp111111-1111-1111-1111-111111111112',
    'B', 85.00, 85.00, 3.00, 9.00,
    'released', true,
    'Solid understanding of limits and derivatives. Recommend extra practice on optimization problems.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Technical Writing: A (94%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c5555555-5555-5555-5555-555555555555',
    'gp111111-1111-1111-1111-111111111112',
    'A', 94.00, 94.00, 3.00, 12.00,
    'released', true,
    'Excellent technical documentation skills. Clear and concise writing style.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Spring 2024 - Final Grades (Previous Semester - Released)
  -- Web Development: A- (91%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c1111111-1111-1111-1111-111111111111',
    'gp111111-1111-1111-1111-111111111113',
    'A-', 91.00, 91.00, 3.00, 11.25,
    'released', true,
    'Great improvement throughout the semester.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- Data Structures: B+ (87%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c2222222-2222-2222-2222-222222222222',
    'gp111111-1111-1111-1111-111111111113',
    'B+', 87.00, 87.00, 3.00, 10.50,
    'released', true,
    'Strong performance on final project.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- Philippine History: A (93%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c3333333-3333-3333-3333-333333333333',
    'gp111111-1111-1111-1111-111111111113',
    'A', 93.00, 93.00, 3.00, 12.00,
    'released', true,
    'Outstanding historical analysis and critical thinking.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- Calculus I: B (84%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c4444444-4444-4444-4444-444444444444',
    'gp111111-1111-1111-1111-111111111113',
    'B', 84.00, 84.00, 3.00, 9.00,
    'released', true,
    'Consistent effort throughout the semester.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- Technical Writing: A (95%)
  INSERT INTO course_grades (student_id, course_id, grading_period_id, letter_grade, numeric_score, percentage, credits, grade_points, status, is_released, teacher_comments, released_at)
  VALUES (
    p_student_id,
    'c5555555-5555-5555-5555-555555555555',
    'gp111111-1111-1111-1111-111111111113',
    'A', 95.00, 95.00, 3.00, 12.00,
    'released', true,
    'Exceptional writing quality and professional presentation.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- CREATE SEMESTER GPA RECORDS
  -- ==========================================

  -- Fall 2024 Midterm GPA
  INSERT INTO semester_gpa (student_id, grading_period_id, term_gpa, cumulative_gpa, term_credits_attempted, term_credits_earned, total_credits_earned, academic_standing)
  VALUES (
    p_student_id,
    'gp111111-1111-1111-1111-111111111112',
    3.65, -- (12.00 + 10.50 + 11.25 + 9.00 + 12.00) / 15 = 54.75 / 15 = 3.65
    3.63, -- Cumulative including previous semesters
    15.00,
    15.00,
    45.00,
    'deans_list'
  ) ON CONFLICT DO NOTHING;

  -- Spring 2024 Final GPA
  INSERT INTO semester_gpa (student_id, grading_period_id, term_gpa, cumulative_gpa, term_credits_attempted, term_credits_earned, total_credits_earned, academic_standing)
  VALUES (
    p_student_id,
    'gp111111-1111-1111-1111-111111111113',
    3.62, -- (11.25 + 10.50 + 12.00 + 9.00 + 12.00) / 15 = 54.75 / 15 = 3.62
    3.60,
    15.00,
    15.00,
    30.00,
    'deans_list'
  ) ON CONFLICT DO NOTHING;

  -- Fall 2023 GPA
  INSERT INTO semester_gpa (student_id, grading_period_id, term_gpa, cumulative_gpa, term_credits_attempted, term_credits_earned, total_credits_earned, academic_standing)
  VALUES (
    p_student_id,
    'gp111111-1111-1111-1111-111111111114',
    3.58,
    3.58,
    15.00,
    15.00,
    15.00,
    'good_standing'
  ) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- CREATE REPORT CARDS
  -- ==========================================

  -- Fall 2024 Midterm Report Card
  INSERT INTO report_cards (student_id, grading_period_id, status, adviser_comments, principal_comments, released_at)
  VALUES (
    p_student_id,
    'gp111111-1111-1111-1111-111111111112',
    'released',
    'Excellent academic performance this midterm. Keep up the great work in all subjects. Your dedication to learning is commendable.',
    'Congratulations on making the Dean''s List. You are a role model for your peers.',
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Spring 2024 Report Card
  INSERT INTO report_cards (student_id, grading_period_id, status, adviser_comments, principal_comments, released_at)
  VALUES (
    p_student_id,
    'gp111111-1111-1111-1111-111111111113',
    'released',
    'Outstanding semester performance. You have shown consistent improvement and strong work ethic.',
    'Well done on another successful semester. Continue striving for excellence.',
    NOW() - INTERVAL '120 days'
  ) ON CONFLICT DO NOTHING;

  -- ==========================================
  -- CREATE ATTENDANCE RECORDS (Past 2 Months)
  -- ==========================================

  -- Loop through past 60 days (2 months)
  FOR v_days_back IN 1..60 LOOP
    v_date := CURRENT_DATE - v_days_back;

    -- Skip weekends (Saturday = 6, Sunday = 0)
    IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN

      -- Create attendance for each course
      -- Realistic pattern: 85% present, 10% late, 3% absent, 2% excused

      -- Web Development (CS 201) - Monday, Wednesday, Friday
      IF EXTRACT(DOW FROM v_date) IN (1, 3, 5) THEN
        INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
        VALUES (
          p_student_id,
          'c1111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          v_date,
          CASE
            WHEN RANDOM() < 0.85 THEN 'present'
            WHEN RANDOM() < 0.93 THEN 'late'
            WHEN RANDOM() < 0.97 THEN 'absent'
            ELSE 'excused'
          END,
          v_date + TIME '08:00:00' + (INTERVAL '0-5 minutes' * RANDOM()),
          v_date + TIME '09:30:00' + (INTERVAL '0-10 minutes' * RANDOM())
        ) ON CONFLICT DO NOTHING;
      END IF;

      -- Data Structures (CS 202) - Tuesday, Thursday
      IF EXTRACT(DOW FROM v_date) IN (2, 4) THEN
        INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
        VALUES (
          p_student_id,
          'c2222222-2222-2222-2222-222222222222',
          '22222222-2222-2222-2222-222222222222',
          v_date,
          CASE
            WHEN RANDOM() < 0.87 THEN 'present'
            WHEN RANDOM() < 0.95 THEN 'late'
            WHEN RANDOM() < 0.98 THEN 'absent'
            ELSE 'excused'
          END,
          v_date + TIME '10:00:00' + (INTERVAL '0-5 minutes' * RANDOM()),
          v_date + TIME '11:30:00' + (INTERVAL '0-10 minutes' * RANDOM())
        ) ON CONFLICT DO NOTHING;
      END IF;

      -- Philippine History (GE 103) - Monday, Wednesday
      IF EXTRACT(DOW FROM v_date) IN (1, 3) THEN
        INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
        VALUES (
          p_student_id,
          'c3333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222',
          v_date,
          CASE
            WHEN RANDOM() < 0.90 THEN 'present'
            WHEN RANDOM() < 0.96 THEN 'late'
            WHEN RANDOM() < 0.99 THEN 'absent'
            ELSE 'excused'
          END,
          v_date + TIME '13:00:00' + (INTERVAL '0-5 minutes' * RANDOM()),
          v_date + TIME '14:30:00' + (INTERVAL '0-10 minutes' * RANDOM())
        ) ON CONFLICT DO NOTHING;
      END IF;

      -- Calculus I (MATH 101) - Monday, Wednesday, Friday
      IF EXTRACT(DOW FROM v_date) IN (1, 3, 5) THEN
        INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
        VALUES (
          p_student_id,
          'c4444444-4444-4444-4444-444444444444',
          '22222222-2222-2222-2222-222222222222',
          v_date,
          CASE
            WHEN RANDOM() < 0.82 THEN 'present'
            WHEN RANDOM() < 0.92 THEN 'late'
            WHEN RANDOM() < 0.96 THEN 'absent'
            ELSE 'excused'
          END,
          v_date + TIME '15:00:00' + (INTERVAL '0-5 minutes' * RANDOM()),
          v_date + TIME '16:30:00' + (INTERVAL '0-10 minutes' * RANDOM())
        ) ON CONFLICT DO NOTHING;
      END IF;

      -- Technical Writing (ENG 201) - Tuesday, Thursday
      IF EXTRACT(DOW FROM v_date) IN (2, 4) THEN
        INSERT INTO teacher_attendance (student_id, course_id, section_id, attendance_date, status, first_seen_at, last_seen_at)
        VALUES (
          p_student_id,
          'c5555555-5555-5555-5555-555555555555',
          '22222222-2222-2222-2222-222222222222',
          v_date,
          CASE
            WHEN RANDOM() < 0.88 THEN 'present'
            WHEN RANDOM() < 0.95 THEN 'late'
            WHEN RANDOM() < 0.98 THEN 'absent'
            ELSE 'excused'
          END,
          v_date + TIME '13:30:00' + (INTERVAL '0-5 minutes' * RANDOM()),
          v_date + TIME '15:00:00' + (INTERVAL '0-10 minutes' * RANDOM())
        ) ON CONFLICT DO NOTHING;
      END IF;

    END IF;
  END LOOP;

  -- ==========================================
  -- ENHANCE STUDENT PROGRESS DATA
  -- ==========================================

  -- Update existing progress records with more variety
  -- Web Dev - 3 lessons completed, 1 in progress
  UPDATE student_progress
  SET progress_percent = 100, completed_at = NOW() - INTERVAL '2 hours'
  WHERE student_id = p_student_id
    AND lesson_id = 'l1111111-1111-1111-1111-111111111111';

  UPDATE student_progress
  SET progress_percent = 100, completed_at = NOW() - INTERVAL '1 day'
  WHERE student_id = p_student_id
    AND lesson_id = 'l1111111-1111-1111-1111-111111111112';

  UPDATE student_progress
  SET progress_percent = 60, last_accessed_at = NOW() - INTERVAL '3 hours'
  WHERE student_id = p_student_id
    AND lesson_id = 'l1111111-1111-1111-1111-111111111121';

  -- Add more progress records
  INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, completed_at, last_accessed_at) VALUES
  -- Web Dev - Additional lessons
  (p_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111113', 75, NULL, NOW() - INTERVAL '1 hour'),
  (p_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111122', 100, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Data Structures - More variety
  (p_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222221', 100, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (p_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222222', 50, NULL, NOW() - INTERVAL '4 hours'),

  -- Philippine History
  (p_student_id, 'c3333333-3333-3333-3333-333333333333', 'l3333333-3333-3333-3333-333333333321', 100, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  (p_student_id, 'c3333333-3333-3333-3333-333333333333', 'l3333333-3333-3333-3333-333333333331', 80, NULL, NOW() - INTERVAL '2 hours'),

  -- Calculus
  (p_student_id, 'c4444444-4444-4444-4444-444444444444', 'l4444444-4444-4444-4444-444444444421', 40, NULL, NOW() - INTERVAL '1 day'),

  -- English
  (p_student_id, 'c5555555-5555-5555-5555-555555555555', 'l5555555-5555-5555-5555-555555555511', 100, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (p_student_id, 'c5555555-5555-5555-5555-555555555555', 'l5555555-5555-5555-5555-555555555521', 90, NULL, NOW() - INTERVAL '6 hours')
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE handle_new_user TO CREATE GRADES/ATTENDANCE
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (auth_user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  RETURNING id INTO v_profile_id;

  -- Create demo student data (from previous migration)
  PERFORM create_demo_student_data(v_profile_id);

  -- Create grades and attendance data
  -- Get the student ID that was just created
  DECLARE
    v_student_id UUID;
    v_school_id UUID := '11111111-1111-1111-1111-111111111111';
  BEGIN
    SELECT id INTO v_student_id FROM students WHERE profile_id = v_profile_id;
    IF v_student_id IS NOT NULL THEN
      PERFORM create_grades_attendance_data(v_student_id, v_school_id);
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
