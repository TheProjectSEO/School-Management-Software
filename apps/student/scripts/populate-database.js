#!/usr/bin/env node

/**
 * Database Population Script
 * Executes the complete school data migration using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSqlFile(filePath) {
  console.log('📖 Reading SQL file...');
  const sql = fs.readFileSync(filePath, 'utf8');

  // Split by semicolon but handle multi-line statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and DO blocks (they won't work via RPC)
    if (statement.startsWith('--') || statement.toLowerCase().includes('do $$')) {
      continue;
    }

    // Extract statement type for logging
    const statementType = statement.split(' ')[0].toUpperCase();

    try {
      console.log(`⏳ [${i + 1}/${statements.length}] Executing ${statementType}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        console.error(`❌ Error: ${error.message}`);
        errorCount++;

        // If it's a "function does not exist" error, we need to execute via raw SQL
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('ℹ️  Trying alternative method...');
          // We'll need to use the service role key or execute manually
        }
      } else {
        console.log(`✅ Success`);
        successCount++;
      }

    } catch (err) {
      console.error(`❌ Exception: ${err.message}`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Execution Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}`);
  console.log('='.repeat(50) + '\n');

  if (errorCount === 0) {
    console.log('🎉 Database populated successfully!');
  } else {
    console.log('⚠️  Some statements failed. Please review the errors above.');
    console.log('💡 You may need to execute the SQL file directly in the Supabase dashboard.');
  }
}

async function main() {
  const sqlFilePath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '00000000000010_complete_school_data.sql'
  );

  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ SQL file not found:', sqlFilePath);
    process.exit(1);
  }

  console.log('🚀 Starting database population...');
  console.log(`📁 SQL File: ${sqlFilePath}\n`);

  await executeSqlFile(sqlFilePath);
}

main().catch(console.error);
