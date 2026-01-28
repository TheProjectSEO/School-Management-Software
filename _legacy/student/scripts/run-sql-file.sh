#!/bin/bash

# Script to execute SQL file in Supabase
# Usage: ./run-sql-file.sh

set -e

echo "🚀 Executing database population SQL..."
echo ""

# Read SQL file
SQL_FILE="./supabase/migrations/00000000000011_populate_clean.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📖 Reading SQL file: $SQL_FILE"
echo ""

# Execute via psql (if available) or print instructions
if command -v psql &> /dev/null; then
    echo "⚠️  Note: Direct PostgreSQL connection may not work due to network restrictions."
    echo "Please execute the SQL file manually in the Supabase SQL Editor."
    echo ""
    echo "Steps:"
    echo "1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new"
    echo "2. Copy the contents of: $SQL_FILE"
    echo "3. Paste into the SQL Editor"
    echo "4. Click 'Run'"
    echo ""
else
    echo "✅ SQL file is ready at: $SQL_FILE"
    echo ""
    echo "To execute this SQL:"
    echo "1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new"
    echo "2. Copy the contents of: $SQL_FILE"
    echo "3. Paste into the SQL Editor"
    echo "4. Click 'Run'"
    echo ""
fi

# Print a sample of the SQL
echo "📝 SQL Preview (first 50 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -50 "$SQL_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "... (file continues)"
