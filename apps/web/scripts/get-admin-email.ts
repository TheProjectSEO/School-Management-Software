import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const authUserId = '8fbba278-5ff4-4e8b-a3c4-938e30dd249a';

  console.log('Looking up admin user:', authUserId);

  const { data, error } = await supabase.auth.admin.getUserById(authUserId);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Email:', data.user?.email);
    console.log('Created:', data.user?.created_at);
  }
}

main().catch(console.error);
