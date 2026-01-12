import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🔍 Inspecting "school software" Schema Structure...\n');
console.log('═'.repeat(70));

// Get all tables
const tablesQuery = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'school software'
  ORDER BY table_name;
`;

const { data: tablesResult, error: tablesError } = await supabase.rpc('exec_sql', {
  query: tablesQuery
}).single();

if (tablesError) {
  console.log('Trying direct query...');
  // Try getting column info for key tables
  const tables = ['schools', 'profiles', 'students', 'teachers', 'courses', 'sections', 'enrollments', 'admin_profiles'];

  for (const tableName of tables) {
    console.log(`\n📋 Table: ${tableName}`);
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'school software'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;

    // Use raw SQL via postgres connection
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: columnsQuery })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Columns:');
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
      });
    } else {
      console.log(`❌ Could not fetch columns: ${response.status}`);
    }
  }
}

console.log('\n' + '═'.repeat(70) + '\n');
