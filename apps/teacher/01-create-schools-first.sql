-- ============================================================================
-- STEP 0: Create Schools First (Run this BEFORE seed-correct-schema.sql)
-- Schema: "school software"
-- ============================================================================

-- Create 3 MSU schools
INSERT INTO "school software".schools (id, slug, name, region, division, accent_color, created_at, updated_at)
VALUES
  (
    '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd'::uuid,
    'msu-main',
    'Mindanao State University - Main Campus',
    'XII',
    'Marawi City',
    '#7B1113',
    NOW(),
    NOW()
  ),
  (
    'f99b0398-9242-4da8-9f63-a2b90a8d4587'::uuid,
    'msu-iit',
    'Mindanao State University - Iligan Institute of Technology',
    'X',
    'Iligan City',
    '#7B1113',
    NOW(),
    NOW()
  ),
  (
    'b06f898f-b401-425b-a73a-d6450ef77c99'::uuid,
    'msu-tcto',
    'Mindanao State University - Tawi-Tawi College of Technology',
    'BARMM',
    'Bongao',
    '#7B1113',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Verify schools were created
SELECT id, name, slug FROM "school software".schools;

-- Expected: 3 schools
