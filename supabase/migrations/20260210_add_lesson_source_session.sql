ALTER TABLE lessons ADD COLUMN source_session_id UUID REFERENCES live_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_lessons_source_session ON lessons(source_session_id);
