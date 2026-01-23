-- ============================================================================
-- ADD ADMIN_ID TO DIRECT_MESSAGES TABLE
-- Description: Allows admins to send messages to students and teachers
-- Schema: school software
-- ============================================================================

-- Set the search path to the correct schema
SET search_path TO "school software";

-- Add admin_id column to direct_messages table
ALTER TABLE direct_messages
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE;

-- Create index for admin messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_admin ON direct_messages(admin_id, created_at DESC);

-- Update the valid_participants constraint to include admin messages
ALTER TABLE direct_messages
DROP CONSTRAINT IF EXISTS valid_participants;

ALTER TABLE direct_messages
ADD CONSTRAINT valid_participants CHECK (
  -- Student to teacher
  (from_student_id IS NOT NULL AND to_teacher_id IS NOT NULL AND admin_id IS NULL) OR
  -- Teacher to student
  (from_teacher_id IS NOT NULL AND to_student_id IS NOT NULL AND admin_id IS NULL) OR
  -- Admin to student
  (admin_id IS NOT NULL AND to_student_id IS NOT NULL AND from_student_id IS NULL AND from_teacher_id IS NULL) OR
  -- Admin to teacher
  (admin_id IS NOT NULL AND to_teacher_id IS NOT NULL AND from_student_id IS NULL AND from_teacher_id IS NULL) OR
  -- Student to admin (via reply)
  (from_student_id IS NOT NULL AND admin_id IS NULL AND to_teacher_id IS NULL AND to_student_id IS NULL) OR
  -- Teacher to admin (via reply)
  (from_teacher_id IS NOT NULL AND admin_id IS NULL AND to_teacher_id IS NULL AND to_student_id IS NULL)
);

-- Add RLS policy for admins to view all messages in their school
DROP POLICY IF EXISTS "Admins can view all school messages" ON direct_messages;
CREATE POLICY "Admins can view all school messages" ON direct_messages
  FOR SELECT USING (
    admin_id IN (
      SELECT ap.id FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND ap.is_active = true
    ) OR
    school_id IN (
      SELECT ap.school_id FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- Add RLS policy for admins to send messages
DROP POLICY IF EXISTS "Admins can send messages" ON direct_messages;
CREATE POLICY "Admins can send messages" ON direct_messages
  FOR INSERT WITH CHECK (
    admin_id IN (
      SELECT ap.id FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- Add RLS policy for admins to update messages (mark as read, etc.)
DROP POLICY IF EXISTS "Admins can update messages" ON direct_messages;
CREATE POLICY "Admins can update messages" ON direct_messages
  FOR UPDATE USING (
    admin_id IN (
      SELECT ap.id FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND ap.is_active = true
    ) OR
    school_id IN (
      SELECT ap.school_id FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE p.auth_user_id = auth.uid()
      AND ap.is_active = true
    )
  );

-- Update the message_conversations view to include admin messages
DROP VIEW IF EXISTS message_conversations;
CREATE OR REPLACE VIEW message_conversations AS
SELECT
  dm.id,
  dm.school_id,
  dm.from_student_id,
  dm.to_teacher_id,
  dm.from_teacher_id,
  dm.to_student_id,
  dm.admin_id,
  dm.subject,
  dm.body,
  dm.is_read,
  dm.read_at,
  dm.parent_message_id,
  dm.created_at,
  -- Get student name if message is from student
  CASE
    WHEN dm.from_student_id IS NOT NULL THEN (
      SELECT p.full_name FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE s.id = dm.from_student_id
    )
    ELSE NULL
  END as from_student_name,
  -- Get teacher name placeholder (will be updated when teacher system integrated)
  CASE
    WHEN dm.from_teacher_id IS NOT NULL THEN 'Teacher'
    ELSE NULL
  END as from_teacher_name,
  -- Get admin name if message is from admin
  CASE
    WHEN dm.admin_id IS NOT NULL THEN (
      SELECT p.full_name FROM admin_profiles ap
      JOIN profiles p ON p.id = ap.profile_id
      WHERE ap.id = dm.admin_id
    )
    ELSE NULL
  END as from_admin_name
FROM direct_messages dm;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN direct_messages.admin_id IS 'Reference to admin who sent the message (if applicable)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
