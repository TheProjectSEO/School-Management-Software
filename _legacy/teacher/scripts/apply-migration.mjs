#!/usr/bin/env node

/**
 * Apply Migration 012: Grading Queue System
 *
 * This script applies the grading queue migration to your Supabase database.
 *
 * Usage:
 *   node scripts/apply-migration.mjs
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
  }
});

async function applyMigration() {
  console.log('🚀 Starting migration application...\n');

  // Read migration file
  const migrationPath = join(projectRoot, 'supabase', 'migrations', '012_grading_queue.sql');
  console.log(`📄 Reading migration: ${migrationPath}`);

  let migrationSQL;
  try {
    migrationSQL = readFileSync(migrationPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }

  console.log(`✓ Migration file loaded (${migrationSQL.length} characters)\n`);

  // Execute migration
  console.log('📝 Applying migration to database...');

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct execution if rpc doesn't work
      console.log('Trying alternative method...');

      // Split by statement and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (stmtError) {
          console.error(`❌ Error in statement ${i + 1}:`, stmtError.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    } else {
      console.log('✅ Migration applied successfully!\n');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📋 Manual Application Required:');
    console.error('1. Go to Supabase Dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Paste the contents of:');
    console.error('   teacher-app/supabase/migrations/012_grading_queue.sql');
    console.error('4. Click "Run"\n');
    process.exit(1);
  }

  // Verify migration
  console.log('🔍 Verifying migration...');

  const { data: tableExists, error: verifyError } = await supabase
    .from('n8n_content_creation.teacher_grading_queue')
    .select('id')
    .limit(1);

  if (!verifyError || verifyError.message.includes('limit')) {
    console.log('✅ Table created successfully!\n');
  } else {
    console.log('⚠️  Could not verify table creation');
    console.log('   Please check Supabase dashboard\n');
  }

  console.log('🎉 Migration process complete!\n');
  console.log('Next steps:');
  console.log('1. Verify tables in Supabase Dashboard > Table Editor');
  console.log('2. Check that n8n_content_creation schema has:');
  console.log('   - teacher_grading_queue');
  console.log('   - assessment_questions');
  console.log('   - student_answers');
  console.log('3. Start testing the grading queue feature!\n');
}

applyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
