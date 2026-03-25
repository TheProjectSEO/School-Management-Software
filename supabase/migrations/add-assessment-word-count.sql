-- Adds min/max word count requirements for essay assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS min_word_count INT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_word_count INT;
