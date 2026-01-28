import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  console.log('=== CHECKING ASSESSMENT TABLE COLUMNS ===\n');

  // Get a sample assessment to see all columns
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Assessment columns:');
  Object.keys(data).forEach(key => {
    console.log(`  - ${key}: ${typeof data[key]} = ${JSON.stringify(data[key])?.substring(0, 50)}`);
  });
}

check();
