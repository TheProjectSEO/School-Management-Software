-- Clean up duplicate / conflicting CHECK constraints on teacher_grading_queue
-- The previous migration may have left old constraints that still block valid status values.

-- Drop ALL check constraints on teacher_grading_queue and recreate cleanly
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop every check constraint on this table
  FOR r IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'teacher_grading_queue'
      AND constraint_type = 'CHECK'
  LOOP
    EXECUTE 'ALTER TABLE teacher_grading_queue DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Recreate a single clean status constraint
ALTER TABLE teacher_grading_queue
  ADD CONSTRAINT tgq_status_check
  CHECK (status IN ('pending', 'in_review', 'graded', 'flagged', 'completed'));

-- Recreate the points validity constraint
ALTER TABLE teacher_grading_queue
  ADD CONSTRAINT tgq_points_valid_check
  CHECK (points_awarded IS NULL OR (points_awarded >= 0 AND points_awarded <= max_points));

-- Verify
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE 'tgq_%';
