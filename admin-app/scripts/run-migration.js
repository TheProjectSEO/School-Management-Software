#!/usr/bin/env node

/**
 * Migration Runner Script
 * Executes SQL migration files using Supabase service role
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: 'school software', // Target our custom schema
  },
});

async function runMigration(filePath) {
  console.log(`\n📋 Reading migration: ${path.basename(filePath)}`);

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('🚀 Executing migration...\n');

  // Execute the SQL using Supabase's RPC
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
  return data;
}

// Get migration file path from command line or use default
const migrationFile = process.argv[2] || 'supabase/migrations/20260112_add_admin_id_to_messages.sql';
const fullPath = path.resolve(process.cwd(), migrationFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Migration file not found: ${fullPath}`);
  process.exit(1);
}

// Run the migration
runMigration(fullPath)
  .then(() => {
    console.log('\n✨ All done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Unexpected error:', err);
    process.exit(1);
  });
