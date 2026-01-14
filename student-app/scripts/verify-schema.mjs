#!/usr/bin/env node

/**
 * Schema Verification Script
 *
 * This script verifies that the Supabase schema configuration is correct.
 * Run this before deployment or when troubleshooting schema issues.
 *
 * Usage:
 *   node scripts/verify-schema.mjs
 *   npm run verify-schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Data is now in the public schema (migrated from "school software")
const EXPECTED_SCHEMA = 'public';

const EXPECTED_TABLES = {
  'schools': ['id', 'name', 'slug', 'region'],
  'sections': ['id', 'school_id', 'name', 'grade_level', 'adviser_teacher_id'],
  'students': ['id', 'school_id', 'profile_id', 'lrn', 'section_id'],
  'courses': ['id', 'school_id', 'section_id', 'teacher_id', 'name'],
  'teacher_profiles': ['id', 'profile_id', 'school_id', 'employee_id'],
  'profiles': ['id', 'auth_user_id', 'full_name'],
};

// Use default public schema (no schema config needed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifySchema() {
  console.log('🔍 Verifying Supabase Schema Configuration...\n');
  console.log(`Expected Schema: "${EXPECTED_SCHEMA}"\n`);

  let allPassed = true;

  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_TABLES)) {
    process.stdout.write(`Checking table "${tableName}"... `);

    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(tableName)
        .select(expectedColumns.join(','))
        .limit(0);

      if (error) {
        console.log(`❌ FAIL`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Code: ${error.code}`);
        allPassed = false;
      } else {
        console.log(`✅ PASS`);
      }
    } catch (err) {
      console.log(`❌ FAIL`);
      console.log(`  Error: ${err.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ Schema verification PASSED!');
    console.log(`\nThe schema "${EXPECTED_SCHEMA}" is correctly configured.`);
    console.log('All required tables and columns are accessible.\n');
    process.exit(0);
  } else {
    console.log('❌ Schema verification FAILED!');
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('1. Check that tables exist in the public schema');
    console.log('2. Verify RLS policies on failing tables');
    console.log('3. Ensure the anon key has proper access');
    console.log('\nTo check which schema has which tables, run:');
    console.log('  SELECT table_schema, table_name FROM information_schema.tables');
    console.log('  WHERE table_name IN (\'schools\', \'sections\', \'students\');\n');
    process.exit(1);
  }
}

verifySchema().catch((error) => {
  console.error('\n❌ Fatal error during verification:', error.message);
  process.exit(1);
});
