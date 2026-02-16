-- Add missing email and status columns to school_profiles
-- Run this in your Supabase SQL Editor

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'school_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE school_profiles ADD COLUMN email TEXT;

    -- Update with emails from auth.users if available
    UPDATE school_profiles sp
    SET email = au.email
    FROM auth.users au
    WHERE sp.id = au.id;

    COMMENT ON COLUMN school_profiles.email IS 'User email address';
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'school_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE school_profiles ADD COLUMN status TEXT DEFAULT 'active';

    -- Set default status for existing records
    UPDATE school_profiles
    SET status = 'active'
    WHERE status IS NULL;

    -- Add check constraint for valid status values
    ALTER TABLE school_profiles
    ADD CONSTRAINT school_profiles_status_check
    CHECK (status IN ('active', 'inactive', 'suspended'));

    COMMENT ON COLUMN school_profiles.status IS 'Account status: active, inactive, or suspended';
  END IF;
END $$;

-- Verify the columns were added
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'school_profiles'
  AND column_name IN ('email', 'status')
ORDER BY column_name;
