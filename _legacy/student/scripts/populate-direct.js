#!/usr/bin/env node

/**
 * Direct Database Population using SQL queries
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) throw error;
  return data;
}

async function populateDatabase() {
  console.log('🚀 Starting direct database population...\n');

  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '00000000000010_complete_school_data.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('📖 Read SQL file successfully');
  console.log('📝 Executing SQL statements...\n');

  // Split into individual statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.includes('DO $$') || stmt.includes('RAISE NOTICE')) {
      continue; // Skip procedural blocks
    }

    try {
      await executeSql(stmt + ';');
      console.log(`✅ [${i + 1}/${statements.length}] Executed successfully`);
    } catch (error) {
      console.error(`❌ [${i + 1}/${statements.length}] Error:`, error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🎉 Population complete!');
}

populateDatabase().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
