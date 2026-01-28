-- Add missing columns to school_profiles
ALTER TABLE school_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- Add comment for role column
COMMENT ON COLUMN school_profiles.role IS 'User role: student, teacher, admin, or support';

-- Add missing columns to fee_categories (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fee_categories') THEN
    -- Add sort_order column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fee_categories' AND column_name = 'sort_order') THEN
      ALTER TABLE fee_categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;

    -- Add category column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fee_categories' AND column_name = 'category') THEN
      ALTER TABLE fee_categories ADD COLUMN category TEXT DEFAULT 'other_fee';
    END IF;
  END IF;
END $$;

-- Add section_id to enrollments if missing and create relationship
DO $$
BEGIN
  -- Check if enrollments table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'enrollments') THEN
    -- Add section_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'section_id') THEN
      ALTER TABLE enrollments ADD COLUMN section_id UUID REFERENCES sections(id);
    END IF;

    -- Create index for section_id if not exists
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_enrollments_section_id') THEN
      CREATE INDEX idx_enrollments_section_id ON enrollments(section_id);
    END IF;
  END IF;
END $$;

-- Add school_year_id to payment_plans if missing
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_plans') THEN
    -- Check if school_years table exists first
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'school_years') THEN
      IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payment_plans' AND column_name = 'school_year_id') THEN
        ALTER TABLE payment_plans ADD COLUMN school_year_id UUID REFERENCES school_years(id);
      END IF;
    END IF;
  END IF;
END $$;

-- Create school_years table if it doesn't exist (needed for payment_plans relationship)
CREATE TABLE IF NOT EXISTS school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  year_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming',
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for school_years
CREATE INDEX IF NOT EXISTS idx_school_years_school_id ON school_years(school_id);
CREATE INDEX IF NOT EXISTS idx_school_years_is_current ON school_years(is_current);
