#!/bin/bash

# ============================================================================
# Schema Configuration Distribution Script
# Purpose: Copy schema configuration to student-app and admin-app
# ============================================================================

set -e  # Exit on error

TEACHER_APP="./teacher-app"
STUDENT_APP="./student-app"
ADMIN_APP="./admin-app"

echo "📦 Distributing Schema Configuration to All Apps"
echo "================================================"
echo ""

# ============================================================================
# Function to distribute to an app
# ============================================================================
distribute_to_app() {
  local APP_PATH=$1
  local APP_NAME=$2

  if [ ! -d "$APP_PATH" ]; then
    echo "⚠️  Skipping $APP_NAME - folder not found at $APP_PATH"
    return
  fi

  echo "📁 Configuring $APP_NAME..."

  # Copy documentation files
  echo "  → Copying UNIVERSAL_SCHEMA_CONFIG.md"
  cp "$TEACHER_APP/UNIVERSAL_SCHEMA_CONFIG.md" "$APP_PATH/"

  echo "  → Copying .env.schema"
  cp "$TEACHER_APP/.env.schema" "$APP_PATH/"

  # Create scripts folder if it doesn't exist
  mkdir -p "$APP_PATH/scripts"

  echo "  → Copying verify-schema.mjs"
  cp "$TEACHER_APP/scripts/verify-schema.mjs" "$APP_PATH/scripts/"
  chmod +x "$APP_PATH/scripts/verify-schema.mjs"

  echo "  ✅ $APP_NAME configured"
  echo ""
}

# ============================================================================
# Distribute to each app
# ============================================================================

distribute_to_app "$STUDENT_APP" "student-app"
distribute_to_app "$ADMIN_APP" "admin-app"

# ============================================================================
# Summary and Next Steps
# ============================================================================

echo "================================================"
echo "✅ Schema configuration distributed!"
echo ""
echo "📋 Next Steps (DO THESE MANUALLY):"
echo ""
echo "1️⃣  Expose schema in Supabase Dashboard:"
echo "   → https://supabase.com/dashboard/project/qyjzqzqqjimittltttph"
echo "   → Settings → API → Exposed Schemas"
echo "   → Add: \"school software\""
echo ""
echo "2️⃣  Update student-app/lib/supabase/client.ts:"
echo "   → Change schema to: \"school software\""
echo "   → Add warning comment"
echo ""
echo "3️⃣  Update student-app/lib/supabase/server.ts:"
echo "   → Change schema to: \"school software\""
echo ""
echo "4️⃣  Update student-app/package.json:"
echo "   → Add verify-schema scripts (see template below)"
echo ""
echo "5️⃣  Repeat steps 2-4 for admin-app"
echo ""
echo "6️⃣  Verify all apps:"
echo "   cd student-app && npm run verify-schema"
echo "   cd ../teacher-app && npm run verify-schema"
echo "   cd ../admin-app && npm run verify-schema"
echo ""
echo "📖 See SCHEMA_SETUP_CHECKLIST.md for detailed instructions"
echo ""

# ============================================================================
# Show package.json template
# ============================================================================

echo "📄 package.json scripts to add:"
echo "================================"
cat << 'EOF'
{
  "scripts": {
    "verify-schema": "node scripts/verify-schema.mjs",
    "predev": "npm run verify-schema",
    "prebuild": "npm run verify-schema"
  }
}
EOF
echo ""
echo "✅ Distribution complete!"
