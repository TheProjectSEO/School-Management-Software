#!/bin/bash
# Deploy Live Classroom Migrations to Supabase
# Run this script to apply all migrations in order

set -e  # Exit on error

echo "🚀 Deploying MSU Live Classroom Migrations..."
echo ""

MIGRATIONS=(
  "20260119000001_foundation_tables.sql"
  "20260119000002_live_sessions.sql"
  "20260119000003_student_interactions.sql"
  "20260119000004_recording_storage.sql"
  "20260119000010_msu_foundation.sql"
  "20260119000011_grade10_courses.sql"
  "20260119000012_grade11_courses.sql"
  "20260119000013_grade12_bscs_bsit_courses.sql"
)

SUPABASE_URL="https://qyjzqzqqjimittltttph.supabase.co"
SUPABASE_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d'=' -f2)

for migration in "${MIGRATIONS[@]}"; do
  file="supabase/migrations/$migration"

  if [ ! -f "$file" ]; then
    echo "❌ Migration file not found: $file"
    continue
  fi

  echo "📝 Applying: $migration"

  # Use psql or supabase CLI if available
  if command -v supabase &> /dev/null; then
    supabase db execute --file "$file"
    echo "✅ Applied: $migration"
  else
    echo "⚠️  Supabase CLI not found. Please apply manually via Supabase Studio:"
    echo "   https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new"
    echo "   Copy/paste content from: $file"
  fi

  echo ""
done

echo "🎉 All migrations processed!"
echo ""
echo "Next steps:"
echo "1. Verify tables created: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/editor"
echo "2. Check RLS policies are active"
echo "3. Test live session creation via API"
