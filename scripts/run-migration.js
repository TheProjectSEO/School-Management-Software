// Script to run migration SQL via Supabase service client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qyjzqzqqjimittltttph.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NTI5MywiZXhwIjoyMDg0MjU1MjkzfQ.oesGPsC0MiiH7sfnf9x7sgu_mrBK9fsLwQkY0ZL7yQU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration to add missing columns...');

  try {
    // Add role column to school_profiles
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';`
    });
    if (error1) {
      console.log('Role column might already exist or RPC not available, trying direct approach...');
    }

    // Let's try using raw SQL through fetch API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: `ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';`
      })
    });

    if (!response.ok) {
      console.log('RPC method not available. Please run the following SQL in Supabase Dashboard SQL Editor:');
      console.log(`
-- Add missing columns to school_profiles
ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- Add comment for role column
COMMENT ON COLUMN school_profiles.role IS 'User role: student, teacher, admin, or support';
      `);
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\nPlease run the SQL manually in Supabase Dashboard SQL Editor.');
  }
}

runMigration();
