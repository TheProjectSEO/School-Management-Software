-- Migration 009: Real-time Messaging Infrastructure
-- Description: Adds support for real-time message delivery, read receipts, and typing indicators
-- Schema: n8n_content_creation

-- ============================================================================
-- PART 1: Add delivered_at column for delivery receipts
-- ============================================================================

ALTER TABLE n8n_content_creation.teacher_direct_messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_teacher_direct_messages_delivered
ON n8n_content_creation.teacher_direct_messages(to_profile_id, delivered_at)
WHERE delivered_at IS NULL;

COMMENT ON COLUMN n8n_content_creation.teacher_direct_messages.delivered_at IS
'Timestamp when message was delivered to recipient (displayed in their UI)';

-- ============================================================================
-- PART 2: Function to mark messages as delivered (batch)
-- Called when user opens a conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION n8n_content_creation.mark_messages_delivered(
  p_profile_id UUID,
  p_partner_profile_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE n8n_content_creation.teacher_direct_messages
  SET delivered_at = NOW()
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND delivered_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.mark_messages_delivered IS
'Marks all messages from partner as delivered to current user';

-- ============================================================================
-- PART 3: Function to mark messages as read (batch)
-- Updates multiple messages and returns count
-- ============================================================================

CREATE OR REPLACE FUNCTION n8n_content_creation.mark_messages_read(
  p_profile_id UUID,
  p_partner_profile_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE n8n_content_creation.teacher_direct_messages
  SET
    is_read = true,
    read_at = NOW(),
    delivered_at = COALESCE(delivered_at, NOW())
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION n8n_content_creation.mark_messages_read IS
'Marks all messages from partner as read by current user';

-- ============================================================================
-- PART 4: Function to get unread count for a user
-- Used for badge display in sidebar
-- ============================================================================

CREATE OR REPLACE FUNCTION n8n_content_creation.get_unread_message_count(
  p_profile_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM n8n_content_creation.teacher_direct_messages
    WHERE to_profile_id = p_profile_id
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_unread_message_count IS
'Returns total unread message count for a user';

-- ============================================================================
-- PART 5: Enable Realtime publication for teacher_direct_messages
-- NOTE: This requires running via Supabase Dashboard or CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE n8n_content_creation.teacher_direct_messages;
-- ============================================================================

-- Add table to realtime publication (if not already added)
-- This command may fail if already added, which is fine
DO $$
BEGIN
  -- Check if publication exists and add table
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to add the table to publication
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE n8n_content_creation.teacher_direct_messages;
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- PART 6: Trigger for read receipt notifications
-- Automatically notifies when message is read (for real-time updates)
-- ============================================================================

CREATE OR REPLACE FUNCTION n8n_content_creation.notify_message_read()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_read changes from false to true, the Postgres Changes
  -- subscription will automatically pick this up
  -- This function is here for any custom notification logic if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS notify_message_read_trigger ON n8n_content_creation.teacher_direct_messages;

CREATE TRIGGER notify_message_read_trigger
  AFTER UPDATE OF is_read ON n8n_content_creation.teacher_direct_messages
  FOR EACH ROW
  WHEN (OLD.is_read = false AND NEW.is_read = true)
  EXECUTE FUNCTION n8n_content_creation.notify_message_read();

-- ============================================================================
-- PART 7: Index optimizations for real-time queries
-- ============================================================================

-- Composite index for efficient conversation queries with read status
CREATE INDEX IF NOT EXISTS idx_teacher_direct_messages_conversation_read
ON n8n_content_creation.teacher_direct_messages(from_profile_id, to_profile_id, is_read, created_at DESC);

-- Index for fetching unread messages efficiently
CREATE INDEX IF NOT EXISTS idx_teacher_direct_messages_unread_recipient
ON n8n_content_creation.teacher_direct_messages(to_profile_id, created_at DESC)
WHERE is_read = false;

-- ============================================================================
-- END OF MIGRATION 009
-- ============================================================================
