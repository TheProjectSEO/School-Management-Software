import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function reset() {
  const supabase = createAdminClient();

  const assessmentId = '445892ed-586d-45e2-a548-b8684bda4fae';

  console.log('=== RESETTING ASSESSMENT TO DRAFT ===\n');

  // Update status to draft
  const { error } = await supabase
    .from('assessments')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', assessmentId);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('✅ Assessment reset to draft status');
  console.log('\nNow you can:');
  console.log('1. Go to the assessment builder');
  console.log('2. Add questions');
  console.log('3. Click "Save Draft" to save');
  console.log('4. Then click "Publish"');

  // Verify
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, status')
    .eq('id', assessmentId)
    .single();

  console.log('\nVerification:');
  console.log('  Title:', assessment?.title);
  console.log('  Status:', assessment?.status);
}

reset();
