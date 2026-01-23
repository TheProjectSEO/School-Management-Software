-- Fix: Infinite recursion in RLS policy for relation "teacher_assignments"
-- Context: Postgres error 42P17 (infinite recursion detected) occurs when a
--          policy on a table references the same table (directly or indirectly)
--          inside its USING/WITH CHECK expression, causing re-evaluation loops.
--
-- Safe approach: Do NOT subquery the same table in the policy. Instead, rely on
--                current row columns (course_id/teacher_id) and join to OTHER
--                tables (enrollments → students → profiles) to scope access.

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE IF EXISTS public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that may be recursive/problematic
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teacher_assignments'
  ) THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.teacher_assignments', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'teacher_assignments'
    );
  END IF;
END$$;

-- Minimal, safe SELECT policy for students
-- Grants visibility of assignments only for the student's enrolled courses
CREATE POLICY "Students can view teachers for enrolled courses"
ON public.teacher_assignments
FOR SELECT
USING (
  -- Scope by enrolled courses without referencing teacher_assignments again
  course_id IN (
    SELECT e.course_id
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- OPTIONAL: If teachers need to read their own assignments, add a teacher policy
-- (safe; also avoids subselects on teacher_assignments)
-- CREATE POLICY "Teachers can view their own assignments"
-- ON public.teacher_assignments
-- FOR SELECT
-- USING (
--   teacher_id IN (
--     SELECT tp.id
--     FROM public.teacher_profiles tp
--     JOIN public.profiles p ON p.id = tp.profile_id
--     WHERE p.auth_user_id = auth.uid()
--   )
-- );

-- NOTE: No INSERT/UPDATE/DELETE policies are defined here; add only if needed.

-- Quick verification queries (run manually after applying):
--   -- As a student user (via Supabase auth)
--   SELECT * FROM public.teacher_assignments LIMIT 10;
--   -- Should return rows for the student's enrolled courses without errors.

