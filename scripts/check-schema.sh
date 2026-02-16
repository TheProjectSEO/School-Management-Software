#!/bin/bash
# Quick script to check lesson_attachments schema using Supabase CLI
# Run: bash scripts/check-schema.sh

echo "============================================"
echo "Lesson Attachments Schema Validation"
echo "============================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Run the simple column check
echo "📋 Checking lesson_attachments columns..."
echo ""
supabase db diff --file - << 'EOF'
SELECT
  column_name,
  data_type,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'lesson_attachments'
ORDER BY
  ordinal_position;
EOF

echo ""
echo "============================================"
echo "✓ Schema check complete!"
echo ""
echo "To run full validation:"
echo "  1. Open Supabase Dashboard"
echo "  2. Go to SQL Editor"
echo "  3. Run: scripts/validate-attachment-schema.sql"
echo "============================================"
