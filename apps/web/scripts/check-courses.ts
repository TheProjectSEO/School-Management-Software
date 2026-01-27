import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('courses').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in courses:');
    console.log(Object.keys(data[0]).join('\n'));
  } else {
    console.log('Table empty');
  }
}
check();
