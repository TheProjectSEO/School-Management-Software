#!/bin/bash

# ============================================================================
# Complete Schema Setup for All Apps
# Purpose: Automatically configure schema for student-app, teacher-app, admin-app
# ============================================================================

set -e

STUDENT_APP="./student-app"
ADMIN_APP="./admin-app"
TEACHER_APP="./teacher-app"

echo "🚀 Setting Up Schema Configuration for All Apps"
echo "================================================"
echo ""

# ============================================================================
# Function to update Supabase client.ts
# ============================================================================
update_client_ts() {
  local APP_PATH=$1
  local FILE="$APP_PATH/lib/supabase/client.ts"

  if [ ! -f "$FILE" ]; then
    echo "  ⚠️  client.ts not found at $FILE"
    return
  fi

  # Backup original
  cp "$FILE" "$FILE.backup"

  # Create new file with correct schema
  cat > "$FILE" << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

/**
 * ⚠️ SCHEMA: "public" - DO NOT CHANGE ⚠️
 *
 * Shared across student-app, teacher-app, admin-app.
 * All school tables are in "public" schema.
 *
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public", // ⚠️ NEVER CHANGE
      },
    }
  )
}

export function createPublicSchemaClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
    }
  )
}
EOF

  echo "  ✅ Updated client.ts (backup saved as client.ts.backup)"
}

# ============================================================================
# Function to update Supabase server.ts
# ============================================================================
update_server_ts() {
  local APP_PATH=$1
  local FILE="$APP_PATH/lib/supabase/server.ts"

  if [ ! -f "$FILE" ]; then
    echo "  ⚠️  server.ts not found at $FILE"
    return
  fi

  # Backup original
  cp "$FILE" "$FILE.backup"

  # Create new file with correct schema
  cat > "$FILE" << 'EOF'
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ⚠️ SCHEMA: "public" - DO NOT CHANGE ⚠️
 *
 * Shared across student-app, teacher-app, admin-app.
 * See UNIVERSAL_SCHEMA_CONFIG.md for details.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public", // ⚠️ NEVER CHANGE
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - can ignore
          }
        },
      },
    }
  );
}

export async function createPublicSchemaClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
EOF

  echo "  ✅ Updated server.ts (backup saved as server.ts.backup)"
}

# ============================================================================
# Function to update package.json
# ============================================================================
update_package_json() {
  local APP_PATH=$1
  local FILE="$APP_PATH/package.json"

  if [ ! -f "$FILE" ]; then
    echo "  ⚠️  package.json not found"
    return
  fi

  # Check if verify-schema already exists
  if grep -q "verify-schema" "$FILE"; then
    echo "  ℹ️  verify-schema scripts already exist in package.json"
    return
  fi

  # Backup
  cp "$FILE" "$FILE.backup"

  # Add scripts using node (works cross-platform)
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$FILE', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['verify-schema'] = 'node scripts/verify-schema.mjs';
    pkg.scripts['predev'] = 'npm run verify-schema';
    pkg.scripts['prebuild'] = 'npm run verify-schema';
    fs.writeFileSync('$FILE', JSON.stringify(pkg, null, 2) + '\n');
  "

  echo "  ✅ Updated package.json (backup saved)"
}

# ============================================================================
# Setup each app
# ============================================================================

setup_app() {
  local APP_PATH=$1
  local APP_NAME=$2

  echo ""
  echo "🔧 Setting up $APP_NAME"
  echo "----------------------------------------"

  if [ ! -d "$APP_PATH" ]; then
    echo "⏭️  Skipping - folder not found"
    return
  fi

  # Copy docs
  echo "  📄 Copying documentation..."
  cp "$TEACHER_APP/UNIVERSAL_SCHEMA_CONFIG.md" "$APP_PATH/" 2>/dev/null || echo "  ⚠️  Could not copy UNIVERSAL_SCHEMA_CONFIG.md"
  cp "$TEACHER_APP/.env.schema" "$APP_PATH/" 2>/dev/null || echo "  ⚠️  Could not copy .env.schema"

  # Copy verification script
  echo "  📄 Copying verification script..."
  mkdir -p "$APP_PATH/scripts"
  cp "$TEACHER_APP/scripts/verify-schema.mjs" "$APP_PATH/scripts/" 2>/dev/null || echo "  ⚠️  Could not copy verify-schema.mjs"
  chmod +x "$APP_PATH/scripts/verify-schema.mjs" 2>/dev/null

  # Update Supabase clients
  echo "  🔧 Updating Supabase client configurations..."
  update_client_ts "$APP_PATH"
  update_server_ts "$APP_PATH"

  # Update package.json
  echo "  📦 Updating package.json..."
  update_package_json "$APP_PATH"

  echo "  ✅ $APP_NAME setup complete!"
}

# ============================================================================
# Run setup for each app
# ============================================================================

setup_app "$STUDENT_APP" "student-app"
setup_app "$ADMIN_APP" "admin-app"

echo ""
echo "================================================"
echo "✅ ALL APPS CONFIGURED!"
echo "================================================"
echo ""
echo "🎯 What Was Done:"
echo "  ✅ Copied UNIVERSAL_SCHEMA_CONFIG.md to each app"
echo "  ✅ Copied .env.schema to each app"
echo "  ✅ Copied verify-schema.mjs to each app"
echo "  ✅ Updated lib/supabase/client.ts (backups saved)"
echo "  ✅ Updated lib/supabase/server.ts (backups saved)"
echo "  ✅ Added verify-schema scripts to package.json"
echo ""
echo "🧪 Test Each App:"
echo "  cd student-app && npm run verify-schema"
echo "  cd ../teacher-app && npm run verify-schema"
echo "  cd ../admin-app && npm run verify-schema"
echo ""
echo "🚀 Then start all apps:"
echo "  cd student-app && npm run dev     # Port 3000"
echo "  cd ../teacher-app && npm run dev  # Port 3001"
echo "  cd ../admin-app && npm run dev    # Port 3002"
echo ""
