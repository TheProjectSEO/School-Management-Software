import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runSQL() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('Missing Supabase credentials');
    return;
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  console.log('Project ref:', projectRef);

  const sql = `
    ALTER TABLE teacher_assessment_questions
    DROP CONSTRAINT IF EXISTS teacher_assessment_questions_question_type_check;

    ALTER TABLE teacher_assessment_questions
    ADD CONSTRAINT teacher_assessment_questions_question_type_check
    CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_blank', 'matching'));
  `;

  console.log('=== RUNNING SQL VIA REST API ===\n');

  // Try using the SQL endpoint (this requires service role)
  try {
    // The Supabase REST API doesn't have a direct SQL endpoint for DDL
    // But we can try the Edge Function approach or pg endpoint

    // Actually, let's try using the PostgREST RPC with a PL/pgSQL DO block
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_ddl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ ddl_sql: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('RPC exec_ddl not available:', error.substring(0, 100));
    } else {
      console.log('✅ SQL executed successfully!');
      return;
    }
  } catch (err) {
    console.log('RPC approach failed');
  }

  // Alternative: Direct pg connection via connection string
  // This would require the pg library and the database password

  console.log('\n==========================================');
  console.log('MANUAL FIX REQUIRED');
  console.log('==========================================\n');
  console.log('Please run this SQL in the Supabase SQL Editor:');
  console.log('(Dashboard → SQL Editor → New Query)\n');
  console.log(sql);
  console.log('\n==========================================\n');

  // Also let's provide the dashboard URL
  console.log(`Dashboard URL: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
}

runSQL();
