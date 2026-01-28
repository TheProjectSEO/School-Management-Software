#!/usr/bin/env node

/**
 * CRITICAL SCHEMA ACCESS DIAGNOSIS
 *
 * This script tests multiple methods of accessing the "public" schema
 * to identify why PGRST106 error persists despite correct configuration.
 *
 * Based on research:
 * - PostgREST may require Accept-Profile header for custom schemas
 * - Schema names with spaces may need special escaping
 * - PostgREST cache may not be invalidated
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCHEMA_NAME = 'public';
const TEST_TABLE = 'schools';

// Initialize multiple client configurations
const clients = {
  standard: createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: SCHEMA_NAME }
    }
  ),

  public: createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: 'public' }
    }
  ),

  withHeaders: createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: SCHEMA_NAME },
      global: {
        headers: {
          'Accept-Profile': SCHEMA_NAME,
          'Content-Profile': SCHEMA_NAME
        }
      }
    }
  ),
};

console.log('🔬 CRITICAL SCHEMA ACCESS DIAGNOSIS\n');
console.log('='.repeat(70));
console.log(`Target Schema: "${SCHEMA_NAME}"`);
console.log(`Test Table: ${TEST_TABLE}`);
console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log('='.repeat(70));
console.log();

/**
 * Test 1: Standard db.schema configuration
 */
async function test1_StandardConfig() {
  console.log('📋 TEST 1: Standard db.schema Configuration');
  console.log('-'.repeat(70));

  try {
    const { data, error } = await clients.standard
      .from(TEST_TABLE)
      .select('id, name, slug')
      .limit(1);

    if (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details:`, error.details);
      console.log(`   Hint:`, error.hint);
      return false;
    }

    console.log('✅ SUCCESS');
    console.log(`   Retrieved: ${data?.length || 0} row(s)`);
    if (data?.[0]) {
      console.log(`   Sample:`, data[0]);
    }
    return true;
  } catch (err) {
    console.log('❌ EXCEPTION');
    console.log(`   ${err.message}`);
    return false;
  }
}

/**
 * Test 2: With Accept-Profile and Content-Profile headers
 */
async function test2_WithHeaders() {
  console.log('\n📋 TEST 2: With Accept-Profile/Content-Profile Headers');
  console.log('-'.repeat(70));

  try {
    const { data, error } = await clients.withHeaders
      .from(TEST_TABLE)
      .select('id, name, slug')
      .limit(1);

    if (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      return false;
    }

    console.log('✅ SUCCESS');
    console.log(`   Retrieved: ${data?.length || 0} row(s)`);
    return true;
  } catch (err) {
    console.log('❌ EXCEPTION');
    console.log(`   ${err.message}`);
    return false;
  }
}

/**
 * Test 3: Query from public schema (baseline test)
 */
async function test3_PublicSchema() {
  console.log('\n📋 TEST 3: Public Schema (Baseline)');
  console.log('-'.repeat(70));

  try {
    // Try to query auth.users (which should be in public schema)
    const { data, error } = await clients.public
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.log('⚠️  Expected behavior - public schema might not have our tables');
      console.log(`   Error: ${error.message}`);
      return null;
    }

    console.log('✅ Public schema accessible');
    console.log(`   Found: ${data?.length || 0} row(s)`);
    return true;
  } catch (err) {
    console.log('⚠️  Exception (may be expected)');
    console.log(`   ${err.message}`);
    return null;
  }
}

/**
 * Test 4: Direct SQL query via RPC
 */
async function test4_DirectSQL() {
  console.log('\n📋 TEST 4: Direct SQL Query via RPC');
  console.log('-'.repeat(70));

  try {
    // First, let's check if the schema exists
    const { data, error } = await clients.public.rpc('exec_sql', {
      sql: `
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'public'
      `
    });

    if (error) {
      console.log('⚠️  RPC not available (expected on Supabase cloud)');
      console.log(`   Error: ${error.message}`);
      return null;
    }

    console.log('✅ Schema check via RPC successful');
    console.log(`   Result:`, data);
    return true;
  } catch (err) {
    console.log('⚠️  RPC method unavailable');
    return null;
  }
}

/**
 * Test 5: Try schema.table notation
 */
async function test5_QualifiedTableName() {
  console.log('\n📋 TEST 5: Fully Qualified Table Name');
  console.log('-'.repeat(70));

  try {
    // This likely won't work but let's test
    const { data, error } = await clients.public
      .from(`"public".${TEST_TABLE}`)
      .select('id, name')
      .limit(1);

    if (error) {
      console.log('❌ FAILED (Expected - PostgREST doesn\'t support this syntax)');
      console.log(`   Error: ${error.message}`);
      return false;
    }

    console.log('✅ SUCCESS (Unexpected!)');
    return true;
  } catch (err) {
    console.log('❌ EXCEPTION (Expected)');
    return false;
  }
}

/**
 * Test 6: Check PostgREST config via API
 */
async function test6_CheckPostgRESTConfig() {
  console.log('\n📋 TEST 6: PostgREST Configuration Check');
  console.log('-'.repeat(70));

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });

    const text = await response.text();
    console.log('✅ PostgREST is responding');
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    return true;
  } catch (err) {
    console.log('❌ Cannot reach PostgREST');
    console.log(`   ${err.message}`);
    return false;
  }
}

/**
 * Test 7: Try raw fetch with custom headers
 */
async function test7_RawFetchWithHeaders() {
  console.log('\n📋 TEST 7: Raw Fetch with Custom Headers');
  console.log('-'.repeat(70));

  const headers = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    'Accept-Profile': SCHEMA_NAME,
    'Content-Profile': SCHEMA_NAME,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  console.log('   Headers:', headers);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${TEST_TABLE}?limit=1`,
      { headers }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, data);
      return false;
    }

    console.log('✅ SUCCESS');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data:`, data);
    return true;
  } catch (err) {
    console.log('❌ EXCEPTION');
    console.log(`   ${err.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  const results = {
    test1: await test1_StandardConfig(),
    test2: await test2_WithHeaders(),
    test3: await test3_PublicSchema(),
    test4: await test4_DirectSQL(),
    test5: await test5_QualifiedTableName(),
    test6: await test6_CheckPostgRESTConfig(),
    test7: await test7_RawFetchWithHeaders(),
  };

  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('='.repeat(70));

  Object.entries(results).forEach(([test, result]) => {
    const icon = result === true ? '✅' : result === false ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${result === true ? 'PASS' : result === false ? 'FAIL' : 'N/A'}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('🎯 RECOMMENDATIONS');
  console.log('='.repeat(70));

  if (results.test7) {
    console.log('✅ Schema accessible with raw fetch + headers');
    console.log('   → Client library may need header configuration update');
    console.log('   → Update lib/supabase/client.ts to add Accept-Profile header');
  } else if (results.test1 || results.test2) {
    console.log('✅ Schema accessible via Supabase client');
    console.log('   → Configuration is correct');
    console.log('   → Issue may be elsewhere in the application');
  } else if (results.test3) {
    console.log('⚠️  Public schema works, but custom schema does not');
    console.log('   → PostgREST may not have reloaded configuration');
    console.log('   → Schema may not be properly exposed');
    console.log('\n   ACTIONS:');
    console.log('   1. Check: SELECT rolconfig FROM pg_roles WHERE rolname = \'authenticator\'');
    console.log('   2. Verify: GRANT USAGE ON SCHEMA "public" TO anon, authenticated');
    console.log('   3. Force reload: NOTIFY pgrst, \'reload config\'');
    console.log('   4. Or migrate to public schema');
  } else {
    console.log('❌ Cannot access ANY schema via API');
    console.log('   → Check Supabase project status');
    console.log('   → Verify API keys are correct');
    console.log('   → Check network connectivity');
  }

  console.log('\n' + '='.repeat(70));
  console.log('📚 REFERENCES');
  console.log('='.repeat(70));
  console.log('• Supabase PGRST106 Docs: https://supabase.com/docs/guides/troubleshooting/pgrst106');
  console.log('• PostgREST Schema Reload: https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema');
  console.log('• GitHub Issue: https://github.com/supabase/postgrest-js/issues/45');
  console.log();
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
