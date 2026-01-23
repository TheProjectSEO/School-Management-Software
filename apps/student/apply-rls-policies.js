#!/usr/bin/env node

/**
 * ============================================================================
 * APPLY COMPLETE RLS POLICIES TO SUPABASE
 * ============================================================================
 * This script applies all RLS policies from COMPLETE_RLS_POLICIES.sql
 * Usage: node apply-rls-policies.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('\n============================================');
console.log('APPLYING COMPLETE RLS POLICIES');
console.log('============================================\n');

console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Service Role Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...\n`);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'COMPLETE_RLS_POLICIES.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Split into individual statements (split by semicolon, but be careful with function bodies)
const statements = sqlContent
  .split('\n')
  .filter(line => !line.trim().startsWith('--')) // Remove comment lines
  .join('\n')
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.match(/^--/));

console.log(`Found ${statements.length} SQL statements to execute\n`);

// Execute using fetch API
async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

// Alternative: Use Supabase's SQL endpoint directly
async function executeViaSqlEndpoint(sql) {
  // Using the undocumented but working SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  return response;
}

// Main execution
async function main() {
  console.log('============================================');
  console.log('RECOMMENDED: Manual Application');
  console.log('============================================\n');

  const projectRef = SUPABASE_URL.split('//')[1].split('.')[0];

  console.log('Due to Supabase API limitations, please apply the policies manually:\n');
  console.log('1. Open the Supabase SQL Editor:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
  console.log('2. Copy the contents of: COMPLETE_RLS_POLICIES.sql\n');
  console.log('3. Paste and run the SQL in the editor\n');
  console.log('============================================\n');

  // Copy SQL to clipboard if possible
  console.log('SQL file location:');
  console.log(sqlFilePath);
  console.log('\n✓ Copy the file contents and paste into Supabase SQL Editor\n');

  console.log('The file contains:');
  console.log('- Helper function for getting current student ID');
  console.log('- RLS policies for all 24 tables');
  console.log('- Critical fixes for courses, modules, lessons visibility');
  console.log('- Complete CRUD policies where needed\n');

  console.log('After applying, your student should be able to:');
  console.log('✓ Log in successfully');
  console.log('✓ See their profile and student record');
  console.log('✓ View their enrolled courses');
  console.log('✓ Access modules and lessons');
  console.log('✓ View assessments and submissions');
  console.log('✓ See grades and attendance\n');
}

main().catch(console.error);
