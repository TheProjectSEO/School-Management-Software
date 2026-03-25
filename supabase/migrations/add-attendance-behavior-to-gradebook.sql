-- Add attendance and behavior columns to course_grades
-- attendance_count: days the student attended
-- total_class_days: total class days held in the period
-- behavior_score: teacher-entered behavior score (0-100)

ALTER TABLE course_grades ADD COLUMN IF NOT EXISTS attendance_count    INT            NOT NULL DEFAULT 0;
ALTER TABLE course_grades ADD COLUMN IF NOT EXISTS total_class_days    INT            NOT NULL DEFAULT 0;
ALTER TABLE course_grades ADD COLUMN IF NOT EXISTS behavior_score      NUMERIC(5,2)   NOT NULL DEFAULT 0;
