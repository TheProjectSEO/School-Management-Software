/**
 * Final fix - create student record with correct profile_id
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROFILE_ID = '370843c8-c593-42c0-8676-410b999e7769';
const SCHOOL_ID = '4fa1be18-ebf6-41e7-a8ee-800ac3815ecd';

async function main() {
  console.log('Creating student record...');
  console.log('profile_id:', PROFILE_ID);
  console.log('school_id:', SCHOOL_ID);

  // First, get a valid section_id
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', SCHOOL_ID)
    .limit(1)
    .single();

  console.log('section_id:', section?.id);

  // Delete any existing student records for this profile (cleanup)
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .eq('profile_id', PROFILE_ID);

  if (deleteError) {
    console.log('Delete error (ok if no records):', deleteError.message);
  }

  // Create new student record
  const { data: student, error: insertError } = await supabase
    .from('students')
    .insert({
      profile_id: PROFILE_ID,
      school_id: SCHOOL_ID,
      section_id: section?.id || null,
      grade_level: '12',
      status: 'active',
      lrn: '2024-DEMO-001',
    })
    .select()
    .single();

  if (insertError) {
    console.log('Insert error:', insertError.message);
    console.log('Full error:', JSON.stringify(insertError, null, 2));
    return;
  }

  console.log('');
  console.log('SUCCESS! Created student:');
  console.log(JSON.stringify(student, null, 2));

  // Verify
  console.log('');
  console.log('Verifying...');
  const { data: verify } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', PROFILE_ID)
    .single();

  if (verify) {
    console.log('VERIFIED: Student exists with id:', verify.id);
  } else {
    console.log('FAILED: Student not found after insert');
  }

  console.log('');
  console.log('='.repeat(40));
  console.log('Login credentials:');
  console.log('Email: mrdariusmaster@gmail.com');
  console.log('Password: demo123z@');
  console.log('='.repeat(40));
}

main().catch(console.error);
