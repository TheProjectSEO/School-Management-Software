CREATE TABLE IF NOT EXISTS section_advisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id),
    UNIQUE(teacher_profile_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_section_advisers_teacher ON section_advisers(teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_section_advisers_section ON section_advisers(section_id);
CREATE INDEX IF NOT EXISTS idx_section_advisers_school ON section_advisers(school_id);

ALTER TABLE section_advisers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'section_advisers' AND policyname = 'Allow read access to section_advisers'
    ) THEN
        CREATE POLICY "Allow read access to section_advisers" ON section_advisers FOR SELECT TO authenticated USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'section_advisers' AND policyname = 'Allow service role full access to section_advisers'
    ) THEN
        CREATE POLICY "Allow service role full access to section_advisers" ON section_advisers FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;
