-- Migration 011: Add RLS Policies for public.modules and public.lessons
-- Description: Allow teachers to perform CRUD on modules/lessons for their assigned courses
-- Schema: public
-- Note: Migration 010 was applied to n8n_content_creation schema by mistake; this fixes it

-- ============================================================================
-- MODULES TABLE - Add write policies for teachers
-- (SELECT policy "Teachers can view modules for their courses" already exists)
-- ============================================================================

DROP POLICY IF EXISTS "Teachers can update modules for their courses" ON public.modules;
DROP POLICY IF EXISTS "Teachers can insert modules for their courses" ON public.modules;
DROP POLICY IF EXISTS "Teachers can delete modules for their courses" ON public.modules;

-- UPDATE policy for teachers
CREATE POLICY "Teachers can update modules for their courses"
  ON public.modules
  FOR UPDATE
  USING (
    course_id IN (
      SELECT ta.course_id
      FROM teacher_assignments ta
      JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
      JOIN profiles p ON tp.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- INSERT policy for teachers
CREATE POLICY "Teachers can insert modules for their courses"
  ON public.modules
  FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT ta.course_id
      FROM teacher_assignments ta
      JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
      JOIN profiles p ON tp.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- DELETE policy for teachers
CREATE POLICY "Teachers can delete modules for their courses"
  ON public.modules
  FOR DELETE
  USING (
    course_id IN (
      SELECT ta.course_id
      FROM teacher_assignments ta
      JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
      JOIN profiles p ON tp.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Teachers can update modules for their courses" ON public.modules
  IS 'Teachers can update modules for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can insert modules for their courses" ON public.modules
  IS 'Teachers can create modules for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can delete modules for their courses" ON public.modules
  IS 'Teachers can delete modules for courses they are assigned to teach';

-- ============================================================================
-- LESSONS TABLE - Add all CRUD policies for teachers
-- (Only student SELECT policy existed before)
-- ============================================================================

DROP POLICY IF EXISTS "Teachers can view lessons for their courses" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can update lessons for their courses" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can insert lessons for their courses" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can delete lessons for their courses" ON public.lessons;

-- SELECT policy for teachers
CREATE POLICY "Teachers can view lessons for their courses"
  ON public.lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = lessons.module_id
      AND m.course_id IN (
        SELECT ta.course_id
        FROM teacher_assignments ta
        JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
        JOIN profiles p ON tp.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

-- UPDATE policy for teachers
CREATE POLICY "Teachers can update lessons for their courses"
  ON public.lessons
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = lessons.module_id
      AND m.course_id IN (
        SELECT ta.course_id
        FROM teacher_assignments ta
        JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
        JOIN profiles p ON tp.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

-- INSERT policy for teachers
CREATE POLICY "Teachers can insert lessons for their courses"
  ON public.lessons
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_id
      AND m.course_id IN (
        SELECT ta.course_id
        FROM teacher_assignments ta
        JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
        JOIN profiles p ON tp.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

-- DELETE policy for teachers
CREATE POLICY "Teachers can delete lessons for their courses"
  ON public.lessons
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = lessons.module_id
      AND m.course_id IN (
        SELECT ta.course_id
        FROM teacher_assignments ta
        JOIN teacher_profiles tp ON ta.teacher_profile_id = tp.id
        JOIN profiles p ON tp.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "Teachers can view lessons for their courses" ON public.lessons
  IS 'Teachers can view lessons for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can update lessons for their courses" ON public.lessons
  IS 'Teachers can update lessons for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can insert lessons for their courses" ON public.lessons
  IS 'Teachers can create lessons for courses they are assigned to teach';
COMMENT ON POLICY "Teachers can delete lessons for their courses" ON public.lessons
  IS 'Teachers can delete lessons for courses they are assigned to teach';

-- ============================================================================
-- END OF MIGRATION 011
-- ============================================================================
