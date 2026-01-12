#!/usr/bin/env node

/**
 * Run Migration 012 - Grading Queue System
 *
 * This script executes the SQL migration using Supabase's PostgreSQL connection.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('📦 Connecting to Supabase...');
console.log(`   Project: ${SUPABASE_URL}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration() {
  // Read migration file
  const migrationPath = join(projectRoot, 'supabase', 'migrations', '012_grading_queue.sql');
  console.log(`📄 Reading migration: 012_grading_queue.sql`);

  const sql = readFileSync(migrationPath, 'utf8');
  console.log(`✓ Loaded ${sql.length} characters\n`);

  console.log('⚠️  IMPORTANT:');
  console.log('   This script cannot execute raw SQL directly.');
  console.log('   Please use one of these methods:\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('METHOD 1: Supabase Dashboard (Recommended)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Open: https://qyjzqzqqjimittltttph.supabase.co');
  console.log('2. Go to: SQL Editor');
  console.log('3. Click: "New query"');
  console.log('4. Copy the SQL from:');
  console.log('   teacher-app/supabase/migrations/012_grading_queue.sql');
  console.log('5. Paste and click "Run"\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('METHOD 2: Supabase CLI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('cd teacher-app');
  console.log('supabase db push --db-url "postgres://postgres:[PASSWORD]@db.qyjzqzqqjimittltttph.supabase.co:5432/postgres"');
  console.log('(Replace [PASSWORD] with your database password)\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('What the Migration Will Create:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ teacher_grading_queue - Manual grading queue');
  console.log('✓ assessment_questions - Questions with answer keys');
  console.log('✓ student_answers - Student responses');
  console.log('✓ Helper functions for queue management');
  console.log('✓ Indexes for performance');
  console.log('✓ Updates to student_submissions table\n');

  console.log('After applying the migration, you can test:');
  console.log('1. Create assessment with essay questions');
  console.log('2. Student submits → essays auto-queue');
  console.log('3. Teacher grades from /teacher/grading');
  console.log('4. Score updates when all items graded\n');
}

runMigration().catch(console.error);
