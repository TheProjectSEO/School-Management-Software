#!/usr/bin/env node

/**
 * Apply Migration 013: Public Schools Access
 *
 * This script applies the public schools access migration to your Supabase database.
 *
 * Usage:
 *   node scripts/apply-migration-013.mjs
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (for admin operations)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'n8n_content_creation'
  }
});

async function applyMigration() {
  console.log('🚀 Starting migration 013 application...\n');

  // Read migration file
  const migrationPath = join(projectRoot, 'supabase', 'migrations', '013_public_schools_access.sql');
  console.log(`📄 Reading migration: ${migrationPath}`);

  let migrationSQL;
  try {
    migrationSQL = readFileSync(migrationPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }

  console.log(`✓ Migration file loaded (${migrationSQL.length} characters)\n`);

  // Execute migration using direct query
  console.log('📝 Applying migration to database...');

  try {
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 150) + '...');
        console.error('\n📋 Manual Application Required:');
        console.error('1. Go to Supabase Dashboard > SQL Editor');
        console.error('2. Paste the contents of:');
        console.error('   teacher-app/supabase/migrations/013_public_schools_access.sql');
        console.error('3. Click "Run"\n');
        process.exit(1);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Migration applied successfully!\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📋 Manual Application Required:');
    console.error('1. Go to Supabase Dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Paste the contents of:');
    console.error('   teacher-app/supabase/migrations/013_public_schools_access.sql');
    console.error('4. Click "Run"\n');
    process.exit(1);
  }

  // Verify migration by checking if we can read schools
  console.log('🔍 Verifying migration...');

  const { data: schools, error: verifyError } = await supabase
    .from('schools')
    .select('id, name')
    .limit(1);

  if (!verifyError && schools) {
    console.log('✅ Public access to schools table verified!\n');
  } else if (verifyError) {
    console.log('⚠️  Verification warning:', verifyError.message);
    console.log('   Please check Supabase dashboard\n');
  }

  console.log('🎉 Migration 013 complete!\n');
  console.log('Next steps:');
  console.log('1. Refresh the teacher registration page');
  console.log('2. Verify schools dropdown now loads correctly');
  console.log('3. Test teacher registration flow\n');
}

applyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
