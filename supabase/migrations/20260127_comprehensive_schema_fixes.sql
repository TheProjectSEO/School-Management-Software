-- Migration: 20260127_comprehensive_schema_fixes.sql
-- Purpose: Fix all issues identified by deep system crawl
-- Issues fixed:
--   1. live_sessions: Column name mismatch (teacher_id -> teacher_profile_id)
--   2. assessments: Missing columns (section_id, status, created_by)
--   3. teacher_daily_attendance: Missing columns (notes, updated_by)
--   4. notification_preferences: Missing table for teacher settings

-- ============================================================================
-- FIX 1: Rename teacher_id column to teacher_profile_id in live_sessions
-- ============================================================================

-- First, drop existing RLS policies that reference the old column name
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON live_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled courses" ON live_sessions;
DROP POLICY IF EXISTS "Service role has full access" ON live_sessions;

-- Drop the old index
DROP INDEX IF EXISTS idx_live_sessions_teacher;

-- Rename the column from teacher_id to teacher_profile_id
DO $$
BEGIN
  -- Check if column needs to be renamed (teacher_id exists but teacher_profile_id doesn't)
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'live_sessions'
    AND column_name = 'teacher_id'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'live_sessions'
    AND column_name = 'teacher_profile_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE live_sessions RENAME COLUMN teacher_id TO teacher_profile_id;
    RAISE NOTICE 'Renamed teacher_id to teacher_profile_id in live_sessions table';
  ELSIF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'live_sessions'
    AND column_name = 'teacher_profile_id'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Column teacher_profile_id already exists in live_sessions table';
  ELSE
    RAISE NOTICE 'Neither teacher_id nor teacher_profile_id found - check table schema';
  END IF;
END $$;

-- Create new index with correct name
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_profile ON live_sessions(teacher_profile_id);

-- ============================================================================
-- FIX 2: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy for teachers to manage their own sessions
CREATE POLICY "Teachers can manage their sessions"
ON live_sessions FOR ALL
USING (
  teacher_profile_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  teacher_profile_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Policy for students to view sessions for their enrolled courses
CREATE POLICY "Students can view sessions for enrolled courses"
ON live_sessions FOR SELECT
USING (
  course_id IN (
    SELECT e.course_id FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

-- Policy for service role to have full access
CREATE POLICY "Service role has full access"
ON live_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- FIX 3: Update related tables that reference teacher_id
-- ============================================================================

-- Update session_reactions RLS policy to use correct column name
DROP POLICY IF EXISTS "Anyone can view reactions in accessible sessions" ON session_reactions;
CREATE POLICY "Anyone can view reactions in accessible sessions"
ON session_reactions FOR SELECT
USING (
  session_id IN (
    SELECT ls.id FROM live_sessions ls
    WHERE ls.course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    OR
    ls.teacher_profile_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  )
);

-- Update session_questions RLS policy
DROP POLICY IF EXISTS "Anyone can view questions in accessible sessions" ON session_questions;
CREATE POLICY "Anyone can view questions in accessible sessions"
ON session_questions FOR SELECT
USING (
  session_id IN (
    SELECT ls.id FROM live_sessions ls
    WHERE ls.course_id IN (
      SELECT e.course_id FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN school_profiles sp ON sp.id = s.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
    OR
    ls.teacher_profile_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  )
);

-- Update session_participants teacher policy
DROP POLICY IF EXISTS "Teachers can view all participants" ON session_participants;
CREATE POLICY "Teachers can view all participants"
ON session_participants FOR SELECT
USING (
  session_id IN (
    SELECT id FROM live_sessions
    WHERE teacher_profile_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  )
);

-- Update teachers can answer questions policy
DROP POLICY IF EXISTS "Teachers can answer questions" ON session_questions;
CREATE POLICY "Teachers can answer questions"
ON session_questions FOR UPDATE
USING (
  session_id IN (
    SELECT id FROM live_sessions
    WHERE teacher_profile_id IN (
      SELECT tp.id FROM teacher_profiles tp
      JOIN school_profiles sp ON sp.id = tp.profile_id
      WHERE sp.auth_user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'live_sessions'
    AND column_name = 'teacher_profile_id'
    AND table_schema = 'public'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE NOTICE 'SUCCESS: live_sessions.teacher_profile_id column exists';
  ELSE
    RAISE EXCEPTION 'FAILED: live_sessions.teacher_profile_id column does not exist';
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN live_sessions.teacher_profile_id IS 'References teacher_profiles(id) - the teacher who created/owns this session';

-- ============================================================================
-- FIX 4: Add missing columns to assessments table
-- Required by: AI Planner feature, assessment filtering by section
-- ============================================================================

DO $$
BEGIN
  -- Add section_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments'
    AND column_name = 'section_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE assessments ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_assessments_section ON assessments(section_id);
    RAISE NOTICE 'Added section_id column to assessments table';
  ELSE
    RAISE NOTICE 'Column section_id already exists in assessments table';
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments'
    AND column_name = 'status'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE assessments ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'closed'));
    CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
    RAISE NOTICE 'Added status column to assessments table';
  ELSE
    RAISE NOTICE 'Column status already exists in assessments table';
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments'
    AND column_name = 'created_by'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE assessments ADD COLUMN created_by UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
    RAISE NOTICE 'Added created_by column to assessments table';
  ELSE
    RAISE NOTICE 'Column created_by already exists in assessments table';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN assessments.section_id IS 'Optional section targeting for section-specific assessments';
COMMENT ON COLUMN assessments.status IS 'Assessment status: draft, published, archived, or closed';
COMMENT ON COLUMN assessments.created_by IS 'Teacher who created the assessment';

-- ============================================================================
-- FIX 5: Add missing columns to teacher_daily_attendance table
-- Required by: Attendance notes feature, audit trail
-- ============================================================================

DO $$
BEGIN
  -- Check if table exists in n8n_content_creation schema
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'teacher_daily_attendance'
    AND table_schema = 'n8n_content_creation'
  ) THEN
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'teacher_daily_attendance'
      AND column_name = 'notes'
      AND table_schema = 'n8n_content_creation'
    ) THEN
      ALTER TABLE n8n_content_creation.teacher_daily_attendance ADD COLUMN notes TEXT;
      RAISE NOTICE 'Added notes column to n8n_content_creation.teacher_daily_attendance table';
    ELSE
      RAISE NOTICE 'Column notes already exists in n8n_content_creation.teacher_daily_attendance table';
    END IF;

    -- Add updated_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'teacher_daily_attendance'
      AND column_name = 'updated_by'
      AND table_schema = 'n8n_content_creation'
    ) THEN
      ALTER TABLE n8n_content_creation.teacher_daily_attendance ADD COLUMN updated_by UUID;
      RAISE NOTICE 'Added updated_by column to n8n_content_creation.teacher_daily_attendance table';
    ELSE
      RAISE NOTICE 'Column updated_by already exists in n8n_content_creation.teacher_daily_attendance table';
    END IF;
  -- Check if table exists in public schema
  ELSIF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'teacher_daily_attendance'
    AND table_schema = 'public'
  ) THEN
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'teacher_daily_attendance'
      AND column_name = 'notes'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE teacher_daily_attendance ADD COLUMN notes TEXT;
      RAISE NOTICE 'Added notes column to public.teacher_daily_attendance table';
    ELSE
      RAISE NOTICE 'Column notes already exists in public.teacher_daily_attendance table';
    END IF;

    -- Add updated_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'teacher_daily_attendance'
      AND column_name = 'updated_by'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE teacher_daily_attendance ADD COLUMN updated_by UUID;
      RAISE NOTICE 'Added updated_by column to public.teacher_daily_attendance table';
    ELSE
      RAISE NOTICE 'Column updated_by already exists in public.teacher_daily_attendance table';
    END IF;
  ELSE
    RAISE NOTICE 'teacher_daily_attendance table not found in either schema';
  END IF;
END $$;

-- ============================================================================
-- FIX 6: Create notification_preferences table for teacher settings
-- Required by: Teacher notification settings feature
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'student', 'admin')),

  -- Email notifications
  email_new_message BOOLEAN DEFAULT true,
  email_announcement BOOLEAN DEFAULT true,
  email_grade_posted BOOLEAN DEFAULT true,
  email_assignment_submitted BOOLEAN DEFAULT true,
  email_session_reminder BOOLEAN DEFAULT true,

  -- Push notifications
  push_new_message BOOLEAN DEFAULT true,
  push_announcement BOOLEAN DEFAULT true,
  push_grade_posted BOOLEAN DEFAULT true,
  push_assignment_submitted BOOLEAN DEFAULT true,
  push_session_reminder BOOLEAN DEFAULT true,

  -- In-app notifications
  in_app_new_message BOOLEAN DEFAULT true,
  in_app_announcement BOOLEAN DEFAULT true,
  in_app_grade_posted BOOLEAN DEFAULT true,
  in_app_assignment_submitted BOOLEAN DEFAULT true,
  in_app_session_reminder BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per user
  UNIQUE(user_id, user_type)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id, user_type);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
ON notification_preferences FOR SELECT
USING (
  user_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT s.id FROM students s
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
ON notification_preferences FOR UPDATE
USING (
  user_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT s.id FROM students s
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
ON notification_preferences FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT tp.id FROM teacher_profiles tp
    JOIN school_profiles sp ON sp.id = tp.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT s.id FROM students s
    JOIN school_profiles sp ON sp.id = s.profile_id
    WHERE sp.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role has full access to notification_preferences" ON notification_preferences;
CREATE POLICY "Service role has full access to notification_preferences"
ON notification_preferences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences for email, push, and in-app notifications';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  fix_count INTEGER := 0;
BEGIN
  -- Check live_sessions.teacher_profile_id
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'teacher_profile_id' AND table_schema = 'public'
  ) THEN
    fix_count := fix_count + 1;
    RAISE NOTICE 'VERIFIED: live_sessions.teacher_profile_id exists';
  ELSE
    RAISE WARNING 'MISSING: live_sessions.teacher_profile_id';
  END IF;

  -- Check assessments.section_id
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'section_id' AND table_schema = 'public'
  ) THEN
    fix_count := fix_count + 1;
    RAISE NOTICE 'VERIFIED: assessments.section_id exists';
  ELSE
    RAISE WARNING 'MISSING: assessments.section_id';
  END IF;

  -- Check assessments.status
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'status' AND table_schema = 'public'
  ) THEN
    fix_count := fix_count + 1;
    RAISE NOTICE 'VERIFIED: assessments.status exists';
  ELSE
    RAISE WARNING 'MISSING: assessments.status';
  END IF;

  -- Check assessments.created_by
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'created_by' AND table_schema = 'public'
  ) THEN
    fix_count := fix_count + 1;
    RAISE NOTICE 'VERIFIED: assessments.created_by exists';
  ELSE
    RAISE WARNING 'MISSING: assessments.created_by';
  END IF;

  -- Check notification_preferences table
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'notification_preferences' AND table_schema = 'public'
  ) THEN
    fix_count := fix_count + 1;
    RAISE NOTICE 'VERIFIED: notification_preferences table exists';
  ELSE
    RAISE WARNING 'MISSING: notification_preferences table';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE: % of 5 fixes verified', fix_count;
  RAISE NOTICE '========================================';
END $$;
