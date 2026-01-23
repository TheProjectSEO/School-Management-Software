#!/bin/bash

echo "🔧 Fixing Next.js 16 async params..."

# Find all route files in dynamic segments
FILES=$(find apps/teacher/app/api -name "route.ts" -path "*/\[*\]/*")

FIXED=0

for file in $FILES; do
  echo "Processing: $file"
  
  # Backup
  cp "$file" "$file.bak"
  
  # Fix interface definitions
  sed -i '' 's/params: {$/params: Promise<{/g' "$file"
  
  # Fix params destructuring
  sed -i '' 's/const { \([a-zA-Z_][a-zA-Z0-9_]*\) } = params$/const { \1 } = await params/g' "$file"
  sed -i '' 's/const { \([^}]*\) } = params$/const { \1 } = await params/g' "$file"
  
  # Fix direct params access
  sed -i '' 's/params\.\([a-zA-Z_][a-zA-Z0-9_]*\)/(await params).\1/g' "$file"
  
  # Check if file was modified
  if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
    echo "  ✅ Fixed"
    ((FIXED++))
    rm "$file.bak"
  else
    echo "  ⏭️  No changes"
    mv "$file.bak" "$file"
  fi
done

echo ""
echo "Fixed $FIXED files"
