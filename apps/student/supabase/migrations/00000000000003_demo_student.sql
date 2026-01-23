-- Create demo student data after user signup
-- This function links a newly created profile to student data

-- Function to create student record and enrollments for demo user
CREATE OR REPLACE FUNCTION create_demo_student_data(p_profile_id UUID)
RETURNS void AS $$
DECLARE
  v_student_id UUID;
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Create student record
  INSERT INTO students (id, school_id, profile_id, lrn, grade_level, section_id)
  VALUES (
    gen_random_uuid(),
    v_school_id,
    p_profile_id,
    '123456789012',
    'College - 2nd Year',
    '22222222-2222-2222-2222-222222222222'
  )
  RETURNING id INTO v_student_id;

  -- Enroll in all courses
  INSERT INTO enrollments (school_id, student_id, course_id) VALUES
  (v_school_id, v_student_id, 'c1111111-1111-1111-1111-111111111111'),
  (v_school_id, v_student_id, 'c2222222-2222-2222-2222-222222222222'),
  (v_school_id, v_student_id, 'c3333333-3333-3333-3333-333333333333'),
  (v_school_id, v_student_id, 'c4444444-4444-4444-4444-444444444444'),
  (v_school_id, v_student_id, 'c5555555-5555-5555-5555-555555555555');

  -- Create some initial progress (simulating started learning)
  INSERT INTO student_progress (student_id, course_id, lesson_id, progress_percent, last_accessed_at) VALUES
  -- Web Dev progress (45% complete on course)
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111111', 100, NOW() - INTERVAL '2 hours'),
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111112', 100, NOW() - INTERVAL '1 day'),
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111121', 60, NOW() - INTERVAL '3 hours'),

  -- Data Structures progress (30% complete)
  (v_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222211', 100, NOW() - INTERVAL '1 day'),
  (v_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222212', 45, NOW() - INTERVAL '5 hours'),

  -- Philippine History progress (25% complete)
  (v_student_id, 'c3333333-3333-3333-3333-333333333333', 'l3333333-3333-3333-3333-333333333311', 100, NOW() - INTERVAL '3 days'),

  -- Calculus progress (20% complete)
  (v_student_id, 'c4444444-4444-4444-4444-444444444444', 'l4444444-4444-4444-4444-444444444411', 80, NOW() - INTERVAL '6 hours');

  -- Create welcome notification
  INSERT INTO notifications (student_id, type, title, message, action_url) VALUES
  (v_student_id, 'announcement', 'Welcome to MSU Student Portal!',
   'Start your learning journey today. Check out your enrolled subjects and begin watching lessons.', '/subjects'),
  (v_student_id, 'assignment', 'New Assignment: HTML Fundamentals Quiz',
   'You have a new quiz due in 3 days. Make sure to complete the HTML lessons first!', '/assessments/a1111111-1111-1111-1111-111111111111'),
  (v_student_id, 'info', 'Pro tip: Download lessons for offline viewing',
   'You can download video lessons to watch offline. Go to Downloads to manage your offline content.', '/downloads');

  -- Create some sample notes
  INSERT INTO notes (student_id, course_id, lesson_id, title, content, type, tags, is_favorite) VALUES
  (v_student_id, 'c1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111111',
   'HTML Basics Summary',
   'Key points:\n- HTML uses tags like <div>, <p>, <h1>\n- Every HTML document needs <!DOCTYPE html>\n- Semantic tags improve accessibility',
   'note', ARRAY['html', 'web-dev', 'basics'], true),
  (v_student_id, 'c2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222211',
   'Array Time Complexity',
   'Access: O(1)\nSearch: O(n)\nInsert at end: O(1)\nInsert at beginning: O(n)',
   'note', ARRAY['arrays', 'big-o', 'data-structures'], false),
  (v_student_id, 'c4444444-4444-4444-4444-444444444444', NULL,
   'Limit Definition',
   'The limit of f(x) as x approaches a equals L means f(x) gets arbitrarily close to L as x gets close to a.',
   'note', ARRAY['calculus', 'limits', 'definition'], true);

  -- Create sample downloads
  INSERT INTO downloads (student_id, lesson_id, title, file_url, file_size_bytes, file_type, status) VALUES
  (v_student_id, 'l1111111-1111-1111-1111-111111111111', 'HTML Basics - Video Lesson',
   'https://storage.example.com/lessons/html-basics.mp4', 52428800, 'video/mp4', 'ready'),
  (v_student_id, 'l1111111-1111-1111-1111-111111111121', 'CSS Introduction - Video',
   'https://storage.example.com/lessons/css-intro.mp4', 78643200, 'video/mp4', 'syncing'),
  (v_student_id, NULL, 'Web Development Cheat Sheet',
   'https://htmlcheatsheet.com/HTML-Cheat-Sheet.pdf', 1048576, 'application/pdf', 'ready');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user creation trigger to also create student data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (auth_user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  RETURNING id INTO v_profile_id;

  -- Create demo student data
  PERFORM create_demo_student_data(v_profile_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
