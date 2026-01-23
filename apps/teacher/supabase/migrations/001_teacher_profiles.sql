-- Migration 001: Teacher Identity Tables
-- Description: Creates teacher profile and assignment tables
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER PROFILES TABLE
-- Purpose: Extends profiles table with teacher-specific data
-- Links to: n8n_content_creation.profiles (via profile_id)
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES n8n_content_creation.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES n8n_content_creation.schools(id) ON DELETE CASCADE,
  employee_id TEXT,
  department TEXT,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(profile_id),
  CONSTRAINT employee_id_check CHECK (employee_id IS NULL OR length(employee_id) > 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_profiles_profile_id ON n8n_content_creation.teacher_profiles(profile_id);
CREATE INDEX idx_teacher_profiles_school_id ON n8n_content_creation.teacher_profiles(school_id);
CREATE INDEX idx_teacher_profiles_is_active ON n8n_content_creation.teacher_profiles(is_active);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_profiles IS 'Teacher-specific profile information linked to main profiles table';
COMMENT ON COLUMN n8n_content_creation.teacher_profiles.profile_id IS 'Links to profiles table (one-to-one)';
COMMENT ON COLUMN n8n_content_creation.teacher_profiles.employee_id IS 'School-assigned employee ID';
COMMENT ON COLUMN n8n_content_creation.teacher_profiles.is_active IS 'Whether teacher is currently active/employed';

-- ============================================================================
-- TEACHER ASSIGNMENTS TABLE
-- Purpose: Maps which teachers teach which sections and subjects
-- Links to: teacher_profiles, sections, courses
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_profile_id UUID NOT NULL REFERENCES n8n_content_creation.teacher_profiles(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES n8n_content_creation.sections(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES n8n_content_creation.courses(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(teacher_profile_id, section_id, course_id)
);

-- Indexes for performance
CREATE INDEX idx_teacher_assignments_teacher ON n8n_content_creation.teacher_assignments(teacher_profile_id);
CREATE INDEX idx_teacher_assignments_section ON n8n_content_creation.teacher_assignments(section_id);
CREATE INDEX idx_teacher_assignments_course ON n8n_content_creation.teacher_assignments(course_id);
CREATE INDEX idx_teacher_assignments_primary ON n8n_content_creation.teacher_assignments(teacher_profile_id, is_primary);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_assignments IS 'Maps teachers to their assigned sections and courses';
COMMENT ON COLUMN n8n_content_creation.teacher_assignments.is_primary IS 'Whether this teacher is the primary instructor for this assignment';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to teacher_profiles
CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- VALIDATION FUNCTION: Ensure teacher and course belong to same school
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.validate_teacher_assignment()
RETURNS TRIGGER AS $$
DECLARE
  teacher_school_id UUID;
  course_school_id UUID;
  section_school_id UUID;
BEGIN
  -- Get teacher's school
  SELECT school_id INTO teacher_school_id
  FROM n8n_content_creation.teacher_profiles
  WHERE id = NEW.teacher_profile_id;

  -- Get course's school
  SELECT school_id INTO course_school_id
  FROM n8n_content_creation.courses
  WHERE id = NEW.course_id;

  -- Get section's school
  SELECT school_id INTO section_school_id
  FROM n8n_content_creation.sections
  WHERE id = NEW.section_id;

  -- Validate all belong to same school
  IF teacher_school_id != course_school_id OR teacher_school_id != section_school_id THEN
    RAISE EXCEPTION 'Teacher, section, and course must belong to the same school';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
CREATE TRIGGER validate_teacher_assignment_trigger
  BEFORE INSERT OR UPDATE ON n8n_content_creation.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.validate_teacher_assignment();

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
