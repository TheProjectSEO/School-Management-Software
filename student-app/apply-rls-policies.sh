#!/bin/bash

# ============================================================================
# APPLY COMPLETE RLS POLICIES TO SUPABASE
# ============================================================================
# This script applies all RLS policies from COMPLETE_RLS_POLICIES.sql
# ============================================================================

set -e  # Exit on error

echo "============================================"
echo "APPLYING COMPLETE RLS POLICIES"
echo "============================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "ERROR: .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
source .env.local

# Check if required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "ERROR: Required environment variables not set"
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    exit 1
fi

echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
echo "Project Ref: $PROJECT_REF"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "============================================"
echo "Step 1: Linking to Supabase project"
echo "============================================"
echo ""

# Link to project (will prompt for password if needed)
supabase link --project-ref $PROJECT_REF || {
    echo "Failed to link project. You may need to run: supabase login"
    exit 1
}

echo ""
echo "============================================"
echo "Step 2: Applying RLS policies"
echo "============================================"
echo ""

# Apply the SQL file
psql "$DATABASE_URL" -f COMPLETE_RLS_POLICIES.sql || {
    echo ""
    echo "Direct psql failed. Trying supabase db push..."

    # Alternative: Use supabase CLI to execute
    cat COMPLETE_RLS_POLICIES.sql | supabase db execute || {
        echo ""
        echo "============================================"
        echo "MANUAL APPLICATION REQUIRED"
        echo "============================================"
        echo ""
        echo "Please apply the policies manually:"
        echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
        echo "2. Copy the contents of: COMPLETE_RLS_POLICIES.sql"
        echo "3. Paste and run the SQL"
        echo ""
        exit 1
    }
}

echo ""
echo "============================================"
echo "SUCCESS!"
echo "============================================"
echo ""
echo "All RLS policies have been applied successfully!"
echo ""
echo "Next steps:"
echo "1. Test the student app login"
echo "2. Verify student can see their courses"
echo "3. Check that data is properly filtered"
echo ""
