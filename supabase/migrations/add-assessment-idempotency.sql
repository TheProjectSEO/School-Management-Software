-- Add idempotency_key column to assessments to prevent duplicate creates
-- Safe to run multiple times

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE assessments ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

-- Unique per teacher so the same key cannot create two assessments
-- (partial unique index — only non-null keys are unique)
CREATE UNIQUE INDEX IF NOT EXISTS assessments_created_by_idempotency_key_idx
  ON assessments (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
