-- ============================================================================
-- DepEd K-12 Grading System Migration
-- Replaces GPA-based grading with DepEd standard grading policy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add deped_component to assessments
--    Maps each assessment to Written Work, Performance Task, or Quarterly Assessment
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'deped_component'
  ) THEN
    ALTER TABLE assessments
      ADD COLUMN deped_component TEXT
      CHECK (deped_component IN ('written_work', 'performance_task', 'quarterly_assessment'));

    -- Default mappings from existing assessment types
    UPDATE assessments SET deped_component = CASE
      WHEN type IN ('quiz', 'assignment', 'exam') THEN 'written_work'
      WHEN type IN ('project', 'participation')   THEN 'performance_task'
      WHEN type IN ('midterm', 'final')            THEN 'quarterly_assessment'
      ELSE 'written_work'
    END
    WHERE deped_component IS NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1b. Add grading_period_id to assessments
--     Links each assessment to a specific grading quarter
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'grading_period_id'
  ) THEN
    ALTER TABLE assessments ADD COLUMN grading_period_id UUID REFERENCES grading_periods(id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Add subject_type to courses
--    Determines which DepEd weight preset applies
--    academic: WW=30%, PT=50%, QA=20%
--    mapeh/tle: WW=20%, PT=60%, QA=20%
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'subject_type'
  ) THEN
    ALTER TABLE courses
      ADD COLUMN subject_type TEXT NOT NULL DEFAULT 'academic'
      CHECK (subject_type IN ('academic', 'mapeh', 'tle'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Extend course_grades with DepEd quarterly grade breakdown
--    Adds WW/PT/QA component scores, initial grade, transmuted grade,
--    and quarterly grade (rounded whole number on 60-100 scale)
-- ----------------------------------------------------------------------------

-- Written Work columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'ww_total_score') THEN
    ALTER TABLE course_grades ADD COLUMN ww_total_score     NUMERIC;
    ALTER TABLE course_grades ADD COLUMN ww_highest_score   NUMERIC;
    ALTER TABLE course_grades ADD COLUMN ww_percentage_score NUMERIC; -- (total/highest)*100
    ALTER TABLE course_grades ADD COLUMN ww_weighted_score  NUMERIC; -- ps * weight
  END IF;
END $$;

-- Performance Task columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'pt_total_score') THEN
    ALTER TABLE course_grades ADD COLUMN pt_total_score      NUMERIC;
    ALTER TABLE course_grades ADD COLUMN pt_highest_score    NUMERIC;
    ALTER TABLE course_grades ADD COLUMN pt_percentage_score NUMERIC;
    ALTER TABLE course_grades ADD COLUMN pt_weighted_score   NUMERIC;
  END IF;
END $$;

-- Quarterly Assessment columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'qa_total_score') THEN
    ALTER TABLE course_grades ADD COLUMN qa_total_score      NUMERIC;
    ALTER TABLE course_grades ADD COLUMN qa_highest_score    NUMERIC;
    ALTER TABLE course_grades ADD COLUMN qa_percentage_score NUMERIC;
    ALTER TABLE course_grades ADD COLUMN qa_weighted_score   NUMERIC;
  END IF;
END $$;

-- Computed grade columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'initial_grade') THEN
    ALTER TABLE course_grades ADD COLUMN initial_grade    NUMERIC;   -- ww_ws + pt_ws + qa_ws
    ALTER TABLE course_grades ADD COLUMN transmuted_grade NUMERIC;   -- after transmutation table/formula
    ALTER TABLE course_grades ADD COLUMN quarterly_grade  INTEGER;   -- rounded final, 60-100
  END IF;
END $$;

-- Lock / release columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'is_locked') THEN
    ALTER TABLE course_grades ADD COLUMN is_locked  BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE course_grades ADD COLUMN locked_at  TIMESTAMPTZ;
    ALTER TABLE course_grades ADD COLUMN locked_by  UUID;
  END IF;
END $$;

-- school_id column (for multi-school upsert scoping)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_grades' AND column_name = 'school_id') THEN
    ALTER TABLE course_grades ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. deped_final_grades
--    Stores the year-end final grade per student per course (avg of 4 quarters)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deped_final_grades (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  school_id         UUID        NOT NULL REFERENCES schools(id)  ON DELETE CASCADE,
  academic_year     TEXT        NOT NULL, -- e.g. "2024-2025"

  q1_grade          INTEGER,   -- Quarterly Grade Q1 (60-100)
  q2_grade          INTEGER,   -- Quarterly Grade Q2
  q3_grade          INTEGER,   -- Quarterly Grade Q3
  q4_grade          INTEGER,   -- Quarterly Grade Q4
  final_grade       INTEGER,   -- (Q1+Q2+Q3+Q4)/4 rounded

  is_released       BOOLEAN     NOT NULL DEFAULT FALSE,
  released_at       TIMESTAMPTZ,
  released_by       UUID,

  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_by       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_id, course_id, academic_year)
);

-- ----------------------------------------------------------------------------
-- 5. deped_general_average
--    Year-end general average and honors determination per student
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deped_general_average (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id             UUID        NOT NULL REFERENCES schools(id)  ON DELETE CASCADE,
  academic_year         TEXT        NOT NULL,

  general_average       NUMERIC,   -- raw average (may be decimal)
  general_average_rounded INTEGER, -- rounded for display
  honors_status         TEXT        CHECK (honors_status IN (
                                      'with_honors',         -- GA 90-94, no subject below 85
                                      'with_high_honors',    -- GA 95-97, no subject below 85
                                      'with_highest_honors'  -- GA 98-100, no subject below 85
                                    )),
  -- Snapshot of subject final grades used for computation
  subject_grades_json   JSONB,     -- [{ course_id, course_name, final_grade }, ...]
  lowest_subject_grade  INTEGER,   -- quick check for honors eligibility

  is_released           BOOLEAN     NOT NULL DEFAULT FALSE,
  released_at           TIMESTAMPTZ,
  released_by           UUID,

  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_id, academic_year)
);

-- ----------------------------------------------------------------------------
-- 6. deped_transmutation_config
--    Per-school configuration: formula-based or official DepEd lookup table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deped_transmutation_config (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
  method           TEXT        NOT NULL DEFAULT 'table'
                               CHECK (method IN ('formula', 'table')),
  -- formula: transmuted = 60 + (initial_grade * 0.40)
  -- table:   official DepEd lookup table (stored below as default; can be overridden)
  custom_table_json JSONB,     -- optional override of the lookup table
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. deped_grade_audit_log
--    Immutable audit trail for any grade override performed by admin
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deped_grade_audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_type     TEXT        NOT NULL CHECK (grade_type IN ('quarterly', 'final', 'general_average')),
  grade_id       UUID        NOT NULL,   -- references the relevant grade row
  action         TEXT        NOT NULL CHECK (action IN ('compute', 'override', 'release', 'lock', 'unlock')),
  previous_value JSONB,
  new_value      JSONB,
  performed_by   UUID        NOT NULL,
  performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason         TEXT
);

-- ----------------------------------------------------------------------------
-- 8. Indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_deped_final_grades_student_year
  ON deped_final_grades (student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_deped_final_grades_course
  ON deped_final_grades (course_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_deped_general_average_student_year
  ON deped_general_average (student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_deped_general_average_school_year
  ON deped_general_average (school_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_course_grades_deped
  ON course_grades (student_id, course_id, grading_period_id);

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------
SELECT
  'assessments.deped_component'                   AS check_item,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assessments' AND column_name='deped_component') AS exists
UNION ALL SELECT 'courses.subject_type',
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='subject_type')
UNION ALL SELECT 'course_grades.quarterly_grade',
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_grades' AND column_name='quarterly_grade')
UNION ALL SELECT 'deped_final_grades table',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deped_final_grades')
UNION ALL SELECT 'deped_general_average table',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deped_general_average')
UNION ALL SELECT 'deped_transmutation_config table',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deped_transmutation_config')
UNION ALL SELECT 'deped_grade_audit_log table',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deped_grade_audit_log');
