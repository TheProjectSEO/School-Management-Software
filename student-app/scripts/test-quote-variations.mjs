#!/usr/bin/env node

/**
 * TEST QUOTE VARIATIONS FOR SCHEMA NAME
 *
 * The error message shows "school software" in the allowed list,
 * but still rejects it. This suggests the issue might be:
 * 1. How we're sending the schema name in headers
 * 2. URL encoding issues
 * 3. PostgREST expecting a specific format
 *
 * This script tests every possible variation of quoting/encoding.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = 'schools';

const schemaVariations = [
  { name: 'No quotes', value: 'school software' },
  { name: 'Double quotes', value: '"school software"' },
  { name: 'Single quotes', value: "'school software'" },
  { name: 'URL encoded space', value: 'school%20software' },
  { name: 'URL encoded with quotes', value: '%22school%20software%22' },
  { name: 'Escaped double quotes', value: '\\"school software\\"' },
  { name: 'Plus sign for space', value: 'school+software' },
  { name: 'Underscore instead of space', value: 'school_software' },
  { name: 'No space', value: 'schoolsoftware' },
];

console.log('🧪 TESTING SCHEMA NAME QUOTE VARIATIONS\n');
console.log('='.repeat(70));
console.log(`Base URL: ${BASE_URL}`);
console.log(`Testing: ${schemaVariations.length} variations`);
console.log('='.repeat(70));
console.log();

async function testSchemaVariation(variation) {
  console.log(`📝 Testing: ${variation.name}`);
  console.log(`   Value: "${variation.value}"`);

  const headers = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Accept-Profile': variation.value,
    'Content-Profile': variation.value,
  };

  try {
    const response = await fetch(
      `${BASE_URL}/rest/v1/${TABLE}?limit=1`,
      { headers }
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      console.log(`   ✅ SUCCESS! Got ${data.length} row(s)`);
      console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));
      if (data[0]) {
        console.log(`   Sample data:`, data[0]);
      }
      return { variation, success: true, response: data };
    } else {
      console.log(`   ❌ Failed - Status: ${response.status}`);
      console.log(`   Error:`, data);
      return { variation, success: false, error: data };
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    return { variation, success: false, error: err.message };
  }
}

async function testAllVariations() {
  const results = [];

  for (const variation of schemaVariations) {
    const result = await testSchemaVariation(variation);
    results.push(result);
    console.log();

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('='.repeat(70));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log();

  if (successful.length > 0) {
    console.log('🎯 WORKING VARIATIONS:');
    successful.forEach(r => {
      console.log(`   ✅ ${r.variation.name}: "${r.variation.value}"`);
    });
    console.log();
    console.log('💡 ACTION REQUIRED:');
    console.log(`   Update lib/supabase/client.ts to use: "${successful[0].variation.value}"`);
    console.log('   Add Accept-Profile and Content-Profile headers with this format');
  } else {
    console.log('❌ NO WORKING VARIATIONS FOUND');
    console.log();
    console.log('🔍 NEXT STEPS:');
    console.log('   1. Run: node scripts/force-postgrest-reload.sql in Supabase SQL Editor');
    console.log('   2. Wait 30-60 seconds for PostgREST to reload');
    console.log('   3. Run this script again');
    console.log('   4. If still failing, consider migrating to public schema');
  }

  console.log();
  console.log('='.repeat(70));
  console.log('📚 COMMON ERROR PATTERNS');
  console.log('='.repeat(70));

  // Analyze common error patterns
  const errorCodes = {};
  failed.forEach(r => {
    if (r.error?.code) {
      errorCodes[r.error.code] = (errorCodes[r.error.code] || 0) + 1;
    }
  });

  if (Object.keys(errorCodes).length > 0) {
    console.log('Error codes seen:');
    Object.entries(errorCodes).forEach(([code, count]) => {
      console.log(`   ${code}: ${count} occurrence(s)`);
    });

    if (errorCodes['PGRST106']) {
      console.log();
      console.log('⚠️  PGRST106 indicates PostgREST hasn\'t reloaded schema config');
      console.log('   This confirms the schema exists but PostgREST can\'t access it');
      console.log('   Solution: Force PostgREST reload or migrate to public schema');
    }
  }

  console.log();
}

testAllVariations().catch(console.error);
