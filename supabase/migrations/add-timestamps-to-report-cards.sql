-- Add missing timestamp columns to report_cards table
-- Run this in the Supabase SQL Editor

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_cards' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE report_cards ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_cards' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE report_cards ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;
