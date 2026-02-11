-- Add section_id to live_sessions so teachers can specify which section a session is for.
-- Previously section was inferred from courses.section_id which breaks for multi-section courses.
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id);

-- Backfill existing rows: pull section_id from teacher_assignments where possible
UPDATE public.live_sessions ls
SET section_id = ta.section_id
FROM public.teacher_assignments ta
WHERE ls.section_id IS NULL
  AND ta.course_id = ls.course_id
  AND ta.teacher_profile_id = ls.teacher_profile_id;
