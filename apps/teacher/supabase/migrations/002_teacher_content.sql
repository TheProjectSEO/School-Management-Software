-- Migration 002: Teacher Content Management Tables
-- Description: Creates tables for transcripts, notes, and content assets
-- Schema: n8n_content_creation (ALL tables in this schema)

-- ============================================================================
-- TEACHER TRANSCRIPTS TABLE
-- Purpose: Stores module transcripts from recordings, live sessions, or AI
-- Links to: modules
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES n8n_content_creation.modules(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('recording', 'live_session', 'upload', 'ai_generated')),
  content TEXT NOT NULL,
  timestamps_json JSONB,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT content_not_empty CHECK (length(content) > 0),
  CONSTRAINT version_positive CHECK (version > 0),
  CONSTRAINT published_consistency CHECK (
    (is_published = false AND published_at IS NULL AND published_by IS NULL) OR
    (is_published = true AND published_at IS NOT NULL AND published_by IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_transcripts_module ON n8n_content_creation.teacher_transcripts(module_id);
CREATE INDEX idx_teacher_transcripts_published ON n8n_content_creation.teacher_transcripts(is_published);
CREATE INDEX idx_teacher_transcripts_source ON n8n_content_creation.teacher_transcripts(source_type);
CREATE INDEX idx_teacher_transcripts_version ON n8n_content_creation.teacher_transcripts(module_id, version);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_transcripts IS 'Module transcripts from various sources with versioning';
COMMENT ON COLUMN n8n_content_creation.teacher_transcripts.source_type IS 'Origin of transcript: recording, live_session, upload, or ai_generated';
COMMENT ON COLUMN n8n_content_creation.teacher_transcripts.timestamps_json IS 'Optional timestamp markers in format: [{"time": "00:01:30", "text": "..."}]';
COMMENT ON COLUMN n8n_content_creation.teacher_transcripts.version IS 'Version number for transcript revisions';

-- ============================================================================
-- TEACHER NOTES TABLE
-- Purpose: Stores lecture notes per module with rich text support
-- Links to: modules
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES n8n_content_creation.modules(id) ON DELETE CASCADE,
  title TEXT,
  rich_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rich_text_not_empty CHECK (length(rich_text) > 0),
  CONSTRAINT version_positive CHECK (version > 0),
  CONSTRAINT published_consistency CHECK (
    (is_published = false AND published_at IS NULL AND published_by IS NULL) OR
    (is_published = true AND published_at IS NOT NULL AND published_by IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_teacher_notes_module ON n8n_content_creation.teacher_notes(module_id);
CREATE INDEX idx_teacher_notes_published ON n8n_content_creation.teacher_notes(is_published);
CREATE INDEX idx_teacher_notes_version ON n8n_content_creation.teacher_notes(module_id, version);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_notes IS 'Lecture notes per module with version control';
COMMENT ON COLUMN n8n_content_creation.teacher_notes.rich_text IS 'HTML or Markdown formatted notes content';
COMMENT ON COLUMN n8n_content_creation.teacher_notes.version IS 'Version number for note revisions';

-- ============================================================================
-- TEACHER CONTENT ASSETS TABLE
-- Purpose: Stores slides, PDFs, recordings, and other teaching materials
-- Links to: modules, lessons, assessments, announcements (polymorphic)
-- ============================================================================
CREATE TABLE n8n_content_creation.teacher_content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('module', 'lesson', 'assessment', 'announcement')),
  owner_id UUID NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('slide', 'pdf', 'image', 'video', 'audio', 'recording', 'document')),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  meta_json JSONB,
  created_by UUID REFERENCES n8n_content_creation.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(title) > 0),
  CONSTRAINT storage_path_not_empty CHECK (length(storage_path) > 0),
  CONSTRAINT file_size_non_negative CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

-- Indexes for performance
CREATE INDEX idx_teacher_content_assets_owner ON n8n_content_creation.teacher_content_assets(owner_type, owner_id);
CREATE INDEX idx_teacher_content_assets_type ON n8n_content_creation.teacher_content_assets(asset_type);
CREATE INDEX idx_teacher_content_assets_created_by ON n8n_content_creation.teacher_content_assets(created_by);
CREATE INDEX idx_teacher_content_assets_created_at ON n8n_content_creation.teacher_content_assets(created_at DESC);

-- Comments
COMMENT ON TABLE n8n_content_creation.teacher_content_assets IS 'Polymorphic table for all teaching content assets';
COMMENT ON COLUMN n8n_content_creation.teacher_content_assets.owner_type IS 'Type of parent entity: module, lesson, assessment, or announcement';
COMMENT ON COLUMN n8n_content_creation.teacher_content_assets.owner_id IS 'UUID of parent entity';
COMMENT ON COLUMN n8n_content_creation.teacher_content_assets.storage_path IS 'Supabase Storage bucket path';
COMMENT ON COLUMN n8n_content_creation.teacher_content_assets.meta_json IS 'Additional metadata: duration, dimensions, etc.';

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================
CREATE TRIGGER update_teacher_transcripts_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_transcripts
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

CREATE TRIGGER update_teacher_notes_updated_at
  BEFORE UPDATE ON n8n_content_creation.teacher_notes
  FOR EACH ROW EXECUTE FUNCTION n8n_content_creation.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Get latest version of transcript for a module
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_latest_transcript(p_module_id UUID)
RETURNS n8n_content_creation.teacher_transcripts AS $$
  SELECT *
  FROM n8n_content_creation.teacher_transcripts
  WHERE module_id = p_module_id
  ORDER BY version DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_latest_transcript IS 'Returns the latest version of a transcript for a given module';

-- ============================================================================
-- HELPER FUNCTION: Get latest version of notes for a module
-- ============================================================================
CREATE OR REPLACE FUNCTION n8n_content_creation.get_latest_notes(p_module_id UUID)
RETURNS n8n_content_creation.teacher_notes AS $$
  SELECT *
  FROM n8n_content_creation.teacher_notes
  WHERE module_id = p_module_id
  ORDER BY version DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION n8n_content_creation.get_latest_notes IS 'Returns the latest version of notes for a given module';

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
