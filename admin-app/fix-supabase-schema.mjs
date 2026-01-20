import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔧 Testing Different Schema Configurations...\n');

// Test 1: Without quotes
console.log('Test 1: schema: "public"');
const client1 = createClient(url, anonKey, {
  db: { schema: 'public' }
});

const { data: test1, error: error1 } = await client1
  .from('profiles')
  .select('count')
  .limit(1);

console.log('Result:', error1 ? `❌ ${error1.message}` : `✅ ${JSON.stringify(test1)}`);

// Test 2: With explicit quotes in string
console.log('\nTest 2: schema: \'"public"\'');
const client2 = createClient(url, anonKey, {
  db: { schema: '"public"' }
});

const { data: test2, error: error2 } = await client2
  .from('profiles')
  .select('count')
  .limit(1);

console.log('Result:', error2 ? `❌ ${error2.message}` : `✅ ${JSON.stringify(test2)}`);

// Test 3: URL encoded
console.log('\nTest 3: schema: school%20software');
const client3 = createClient(url, anonKey, {
  db: { schema: 'school%20software' }
});

const { data: test3, error: error3 } = await client3
  .from('profiles')
  .select('count')
  .limit(1);

console.log('Result:', error3 ? `❌ ${error3.message}` : `✅ ${JSON.stringify(test3)}`);

// Test 4: Via headers
console.log('\nTest 4: Using headers');
const client4 = createClient(url, anonKey, {
  global: {
    headers: {
      'Accept-Profile': '"public"'
    }
  }
});

const { data: test4, error: error4 } = await client4
  .from('profiles')
  .select('count')
  .limit(1);

console.log('Result:', error4 ? `❌ ${error4.message}` : `✅ ${JSON.stringify(test4)}`);

console.log('\n' + '═'.repeat(60) + '\n');
