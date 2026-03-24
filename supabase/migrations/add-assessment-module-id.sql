-- Add module_id to assessments so they can be linked directly to a module
-- (lesson_id already existed; module_id is a higher-level grouping)
-- Safe to run multiple times

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE assessments
      ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS assessments_module_id_idx ON assessments(module_id)
  WHERE module_id IS NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'assessments' AND column_name IN ('module_id', 'lesson_id', 'idempotency_key')
ORDER BY column_name;
