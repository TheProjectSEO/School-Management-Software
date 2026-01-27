import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function check() {
  const supabase = createAdminClient();

  // Get one row with all columns
  const { data, error } = await supabase
    .from('teacher_assessment_questions')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in teacher_assessment_questions:');
    console.log(Object.keys(data[0]).join('\n'));
  } else {
    console.log('Table empty, querying schema...');
    // Try insert with known columns to see what's accepted
    const testInsert = await supabase
      .from('teacher_assessment_questions')
      .insert({
        assessment_id: '00000000-0000-0000-0000-000000000000',
        question_text: 'test',
        question_type: 'multiple_choice',
        points: 1
      })
      .select();

    if (testInsert.error) {
      console.log('Insert test error:', testInsert.error.message);
    } else {
      console.log('Columns:', Object.keys(testInsert.data[0]).join('\n'));
      // Clean up
      await supabase.from('teacher_assessment_questions').delete().eq('question_text', 'test');
    }
  }
}

check();
