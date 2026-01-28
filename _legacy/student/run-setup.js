#!/usr/bin/env node
/**
 * Script to setup grades and attendance data
 * Run with: node run-setup.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSetup() {
  try {
    console.log('📖 Reading SQL file...');
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'setup_grades_attendance.sql'),
      'utf-8'
    );

    console.log('🚀 Executing SQL setup script...');
    console.log('This may take a minute...\n');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });

    if (error) {
      // If exec_sql function doesn't exist, we'll need to run it differently
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  Direct SQL execution not available.');
        console.log('\n📋 Please run the setup manually:');
        console.log('1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql');
        console.log('2. Copy the contents of: setup_grades_attendance.sql');
        console.log('3. Paste and run in the SQL Editor\n');
        process.exit(1);
      }
      throw error;
    }

    console.log('✅ Setup completed successfully!');
    console.log('\n📊 Verifying setup...');

    // Verify tables were created
    const { data: tables, error: tableError } = await supabase
      .from('grading_periods')
      .select('id')
      .limit(1);

    if (tableError) {
      throw new Error(`Verification failed: ${tableError.message}`);
    }

    console.log('✅ Tables created successfully');
    console.log('\n🎉 All done! You can now:');
    console.log('   - View grades at /grades');
    console.log('   - View attendance at /attendance');
    console.log('   - Check progress at /subjects');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('\n📋 Manual setup required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql');
    console.log('2. Copy the contents of: setup_grades_attendance.sql');
    console.log('3. Paste and run in the SQL Editor\n');
    process.exit(1);
  }
}

runSetup();
