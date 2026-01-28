import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🌱 Running Admin Data Seeding Script...\n');
console.log('═'.repeat(70));

// Read the SQL file
const sqlContent = readFileSync(join(__dirname, 'SEED_ADMIN_DATA.sql'), 'utf-8');

// Split by semicolons but keep comments
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^-{2,}/));

console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

// Create client with service role for admin access
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

let successCount = 0;
let errorCount = 0;
const errors = [];

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i].trim();

  // Skip empty statements and comments
  if (!statement || statement.startsWith('--')) continue;

  // Skip SET statements (they don't work via REST API)
  if (statement.toUpperCase().startsWith('SET ')) {
    console.log(`⏭️  Skipping SET statement ${i + 1}`);
    continue;
  }

  // Execute statement
  try {
    console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
    console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);

    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': '"public"'
      },
      body: JSON.stringify({ query: statement })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`   ✅ Success`);
    successCount++;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errorCount++;
    errors.push({ statement: i + 1, error: error.message, sql: statement.substring(0, 100) });
  }
}

console.log('\n' + '═'.repeat(70));
console.log('\n📊 SEEDING SUMMARY:\n');
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ❌ Failed: ${errorCount}`);

if (errors.length > 0 && errors.length < 10) {
  console.log('\n❌ Errors encountered:');
  errors.forEach(e => {
    console.log(`\n   Statement ${e.statement}:`);
    console.log(`   SQL: ${e.sql}...`);
    console.log(`   Error: ${e.error}`);
  });
}

console.log('\n' + '═'.repeat(70));

// Verify the data
console.log('\n🔍 Verifying seeded data...\n');

const checks = [
  { table: 'schools', query: 'SELECT COUNT(*) as count FROM "public".schools' },
  { table: 'profiles', query: 'SELECT COUNT(*) as count FROM "public".profiles' },
  { table: 'students', query: 'SELECT COUNT(*) as count FROM "public".students' },
  { table: 'courses', query: 'SELECT COUNT(*) as count FROM "public".courses' },
  { table: 'enrollments', query: 'SELECT COUNT(*) as count FROM "public".enrollments' },
  { table: 'modules', query: 'SELECT COUNT(*) as count FROM "public".modules' },
  { table: 'lessons', query: 'SELECT COUNT(*) as count FROM "public".lessons' },
  { table: 'assessments', query: 'SELECT COUNT(*) as count FROM "public".assessments' },
];

for (const check of checks) {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: check.query })
    });

    if (response.ok) {
      const result = await response.json();
      const count = result[0]?.count || 0;
      console.log(`   ${check.table.padEnd(20)} : ${count} records`);
    } else {
      console.log(`   ${check.table.padEnd(20)} : ❌ Error fetching`);
    }
  } catch (error) {
    console.log(`   ${check.table.padEnd(20)} : ❌ ${error.message}`);
  }
}

console.log('\n✅ Seeding complete!\n');
