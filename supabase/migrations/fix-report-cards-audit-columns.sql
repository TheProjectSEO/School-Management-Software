-- Add remaining audit/workflow columns to report_cards
-- Run this in the Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'approved_at') THEN
    ALTER TABLE report_cards ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'approved_by') THEN
    ALTER TABLE report_cards ADD COLUMN approved_by TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'released_at') THEN
    ALTER TABLE report_cards ADD COLUMN released_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'released_by') THEN
    ALTER TABLE report_cards ADD COLUMN released_by TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'pdf_generated_at') THEN
    ALTER TABLE report_cards ADD COLUMN pdf_generated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Verify all expected columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'report_cards'
ORDER BY ordinal_position;
