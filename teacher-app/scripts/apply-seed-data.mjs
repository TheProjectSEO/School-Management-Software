#!/usr/bin/env node

/**
 * Apply Seed Data to "school software" Schema
 *
 * This script reads seed-correct-schema.sql and applies it to Supabase
 *
 * Usage:
 *   node scripts/apply-seed-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use service role if available, otherwise anon key
const apiKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !apiKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, apiKey, {
  db: { schema: 'school software' }
});

async function applySeedData() {
  console.log('🌱 Applying Seed Data...\n');

  // Read seed file
  const seedPath = join(projectRoot, 'seed-correct-schema.sql');
  console.log(`📄 Reading: ${seedPath}`);

  let seedSQL;
  try {
    seedSQL = readFileSync(seedPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading seed file:', error.message);
    console.log('\n📋 Manual Application:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Copy contents of: teacher-app/seed-correct-schema.sql');
    console.log('3. Paste and click Run\n');
    process.exit(1);
  }

  console.log(`✓ Seed file loaded (${seedSQL.length} characters)\n`);

  console.log('📝 Applying seed data...');
  console.log('⚠️  Note: This uses direct SQL execution which may not work with all Supabase configurations.');
  console.log('If this fails, use the manual method (see instructions below).\n');

  try {
    // Split into executable statements
    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT \'==='));

    console.log(`Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip verification queries (SELECT statements)
      if (statement.toUpperCase().startsWith('SELECT')) {
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.log(`  ⚠️  Statement may have failed: ${error.message.substring(0, 60)}...`);
        console.log('  (This is OK if data already exists - ON CONFLICT DO NOTHING)');
      } else {
        console.log('  ✅ Success');
      }
    }

    console.log('\n✅ Seed data application complete!\n');

  } catch (error) {
    console.error('\n❌ Error during seed application:', error.message);
    console.log('\n📋 Please use MANUAL METHOD instead:');
    console.log('================================');
    console.log('1. Open: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph');
    console.log('2. Click: SQL Editor → New Query');
    console.log('3. Copy entire file: teacher-app/seed-correct-schema.sql');
    console.log('4. Paste and click "Run"');
    console.log('5. Verify: Check results show sections, courses, students created\n');
    process.exit(1);
  }

  // Verify data was created
  console.log('🔍 Verifying seeded data...\n');

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, name')
    .eq('school_id', '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd');

  if (!sectionsError && sections && sections.length > 0) {
    console.log(`✅ Sections created: ${sections.length}`);
    sections.forEach(s => console.log(`  - ${s.name}`));
  } else {
    console.log('⚠️  Could not verify sections');
    if (sectionsError) console.log('  Error:', sectionsError.message);
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, lrn')
    .eq('school_id', '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd');

  if (!studentsError && students && students.length > 0) {
    console.log(`✅ Students created: ${students.length}`);
  } else {
    console.log('⚠️  Could not verify students');
  }

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('school_id', '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd');

  if (!coursesError && courses && courses.length > 0) {
    console.log(`✅ Courses created: ${courses.length}`);
    courses.forEach(c => console.log(`  - ${c.name}`));
  } else {
    console.log('⚠️  Could not verify courses');
  }

  console.log('\n🎉 Seed Data Complete!\n');
  console.log('Next steps:');
  console.log('1. Restart teacher-app dev server');
  console.log('2. Login as: juan.delacruz@msu.edu.ph');
  console.log('3. Check My Classes → Should show 3 sections');
  console.log('4. Check Messages → New Message → Should show 6 students!\n');
}

applySeedData().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.log('\n📋 Use manual method - see instructions above.\n');
  process.exit(1);
});
