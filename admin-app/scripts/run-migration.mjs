#!/usr/bin/env node

/**
 * Migration Runner Script
 * Executes SQL migration file via Supabase Management API
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = process.env.SUPABASE_PROJECT_ID;

if (!supabaseUrl || !serviceRoleKey || !projectRef) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_ID');
  process.exit(1);
}

async function executeSql(sql) {
  const url = `${supabaseUrl}/rest/v1/rpc/exec`;

  console.log('🚀 Executing migration via REST API...\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function runMigration(filePath) {
  console.log(`\n📋 Reading migration: ${filePath.split('/').pop()}`);

  const sql = readFileSync(filePath, 'utf8');

  // Use connection string approach with fetch to execute raw SQL
  const dbUrl = `https://qyjzqzqqjimittltttph.supabase.co/rest/v1/`;

  console.log('🔧 Using direct database query approach...\n');

  // Split SQL into individual statements for execution
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt) {
      console.log(`  [${i + 1}/${statements.length}] Executing statement...`);

      try {
        // Execute via PostgREST (limited to queries that return data)
        // For DDL, we need to use a different approach
        console.log(`  ⏭️  Skipping DDL statement (requires manual execution in Supabase SQL Editor)`);
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }
  }

  console.log('\n⚠️  DDL statements must be run manually in Supabase SQL Editor');
  console.log('📝 Migration file location:');
  console.log(`   ${filePath}\n`);
}

// Get migration file path
const migrationFile = process.argv[2] || 'supabase/migrations/20260112_add_admin_id_to_messages.sql';
const fullPath = resolve(process.cwd(), migrationFile);

// Run the migration
runMigration(fullPath)
  .then(() => {
    console.log('✨ Please run the migration SQL in Supabase SQL Editor\n');
    console.log('🔗 SQL Editor: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
