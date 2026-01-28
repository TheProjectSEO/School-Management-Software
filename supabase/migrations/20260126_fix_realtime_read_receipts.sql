-- ============================================================================
-- FIX REALTIME FOR READ RECEIPTS
-- This ensures UPDATE events are properly broadcast for seen indicators
-- ============================================================================

-- 1. Ensure REPLICA IDENTITY FULL is set (needed for UPDATE events in realtime)
ALTER TABLE public.teacher_direct_messages REPLICA IDENTITY FULL;

-- 2. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their messages" ON public.teacher_direct_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.teacher_direct_messages;
DROP POLICY IF EXISTS "Realtime messages access" ON public.teacher_direct_messages;

-- 3. Create comprehensive SELECT policy for realtime subscriptions
-- Users can see messages they sent OR received
CREATE POLICY "Users can view their messages"
ON public.teacher_direct_messages FOR SELECT
TO authenticated
USING (
  from_profile_id IN (SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid())
  OR
  to_profile_id IN (SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid())
);

-- 4. Users can update messages they RECEIVED (to mark as read)
CREATE POLICY "Users can update their received messages"
ON public.teacher_direct_messages FOR UPDATE
TO authenticated
USING (
  to_profile_id IN (SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  to_profile_id IN (SELECT id FROM public.school_profiles WHERE auth_user_id = auth.uid())
);

-- 5. Ensure service role has full access (for RPC functions)
DROP POLICY IF EXISTS "Service role full access" ON public.teacher_direct_messages;
CREATE POLICY "Service role full access"
ON public.teacher_direct_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Make sure the table is in the realtime publication
DO $$
BEGIN
  -- Try to add to publication (will error if already exists, which is fine)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_direct_messages;
EXCEPTION
  WHEN duplicate_object THEN
    -- Already in publication, ignore
    NULL;
END $$;

-- 7. Recreate mark_messages_read to ensure it triggers realtime
CREATE OR REPLACE FUNCTION mark_messages_read(p_profile_id UUID, p_partner_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update all unread messages from partner to this user
  UPDATE public.teacher_direct_messages
  SET
    is_read = true,
    read_at = COALESCE(read_at, NOW()),
    updated_at = NOW()  -- Update timestamp to ensure realtime triggers
  WHERE to_profile_id = p_profile_id
    AND from_profile_id = p_partner_profile_id
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;

-- 8. Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_direct_messages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.teacher_direct_messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 9. Create trigger to auto-update updated_at on any update
CREATE OR REPLACE FUNCTION update_teacher_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teacher_direct_messages_updated_at ON public.teacher_direct_messages;
CREATE TRIGGER trigger_update_teacher_direct_messages_updated_at
  BEFORE UPDATE ON public.teacher_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_direct_messages_updated_at();

-- 10. Verify setup
SELECT
  'Realtime tables: ' || string_agg(tablename, ', ') as realtime_tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
