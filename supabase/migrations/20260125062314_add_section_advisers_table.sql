-- Create section_advisers table for tracking teacher advisory assignments
CREATE TABLE IF NOT EXISTS section_advisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each section can only have one adviser
    UNIQUE(section_id),
    -- Each teacher can only be adviser once per section (redundant with above but explicit)
    UNIQUE(teacher_profile_id, section_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_section_advisers_teacher ON section_advisers(teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_section_advisers_section ON section_advisers(section_id);
CREATE INDEX IF NOT EXISTS idx_section_advisers_school ON section_advisers(school_id);

-- Add RLS policies
ALTER TABLE section_advisers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Allow read access to section_advisers" ON section_advisers;
DROP POLICY IF EXISTS "Allow service role full access to section_advisers" ON section_advisers;

-- Policy: Allow authenticated users to read section advisers
CREATE POLICY "Allow read access to section_advisers"
    ON section_advisers
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access to section_advisers"
    ON section_advisers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
