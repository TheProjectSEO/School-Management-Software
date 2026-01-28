import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  console.log('=== FIXING ASSESSMENT DUE DATES ===\n');

  // Set due date to 7 days from now
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const dueDateStr = futureDate.toISOString();

  // Update Quiz assessment
  const { error } = await supabase
    .from('assessments')
    .update({ due_date: dueDateStr })
    .eq('title', 'Quiz')
    .is('due_date', null);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Updated Quiz due date to:', dueDateStr);
  }

  // Verify
  const { data: quiz } = await supabase
    .from('assessments')
    .select('title, due_date, status')
    .eq('title', 'Quiz')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('\nVerification:');
  console.log('Title:', quiz?.title);
  console.log('Due Date:', quiz?.due_date);
  console.log('Status:', quiz?.status);

  const now = new Date().toISOString();
  if (quiz?.due_date && quiz.due_date > now) {
    console.log('\n✅ Assessment should now be visible to students!');
  }
}

fix();
