import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

console.log('🔍 Testing Supabase Connection...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', url);
console.log('Key:', key ? `${key.substring(0, 20)}...` : 'NOT SET');
console.log('');

if (!url || !key) {
  console.error('❌ Environment variables not loaded!');
  console.log('\nChecking .env.local file...');
  process.exit(1);
}

try {
  const supabase = createClient(url, key);

  console.log('Testing authentication endpoint...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@test.com',
    password: 'Test123!'
  });

  if (error) {
    console.error('❌ Authentication Error:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Authentication successful!');
    console.log('User:', data.user?.email);
  }

  // Test a simple query
  console.log('\nTesting database query...');
  const { data: profiles, error: queryError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (queryError) {
    console.error('❌ Query Error:', queryError.message);
  } else {
    console.log('✅ Query successful!');
    console.log('Profiles found:', profiles?.length || 0);
  }

} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}
