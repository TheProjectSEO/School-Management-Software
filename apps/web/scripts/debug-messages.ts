/**
 * Debug messages to understand what's happening
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDENT_ID = 'cea4cbcf-37ee-4724-af5a-800db5ae82a6';
const TEACHER_PROFILE_ID = 'a577e3ae-22b5-4ad7-9126-ba47ae1f56e7';

async function main() {
  console.log('='.repeat(60));
  console.log('DEBUG MESSAGES');
  console.log('='.repeat(60));

  // 1. Check the student's profile_id
  console.log('\n1. Getting student profile_id...');
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, profile_id, profile:school_profiles(id, full_name)')
    .eq('id', STUDENT_ID)
    .single();

  if (studentError) {
    console.log('   ERROR:', studentError.message);
  } else {
    console.log('   Student ID:', student?.id);
    console.log('   Student profile_id:', student?.profile_id);
    console.log('   Student name:', (student?.profile as any)?.full_name);
  }

  // 2. Check if the teacher_profile_id is actually a teacher
  console.log('\n2. Checking teacher profile...');
  const { data: teacherProfile, error: teacherError } = await supabase
    .from('school_profiles')
    .select('id, full_name')
    .eq('id', TEACHER_PROFILE_ID)
    .single();

  if (teacherError) {
    console.log('   ERROR:', teacherError.message);
  } else {
    console.log('   Profile ID:', teacherProfile?.id);
    console.log('   Profile name:', teacherProfile?.full_name);
  }

  // Check if this profile is a teacher
  const { data: isTeacher } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('profile_id', TEACHER_PROFILE_ID)
    .single();

  console.log('   Is teacher?:', isTeacher ? 'YES' : 'NO');

  // Check if this profile is a student
  const { data: isStudent } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', TEACHER_PROFILE_ID)
    .single();

  console.log('   Is student?:', isStudent ? 'YES' : 'NO');

  // 3. Check what messages exist
  console.log('\n3. Checking direct_messages table...');
  const { data: directMessages, error: dmError } = await supabase
    .from('direct_messages')
    .select('*')
    .limit(10);

  if (dmError) {
    console.log('   ERROR:', dmError.message);
  } else {
    console.log('   Total messages found:', directMessages?.length || 0);
    directMessages?.forEach((m, i) => {
      console.log(`   Message ${i + 1}:`, {
        from: m.from_profile_id,
        to: m.to_profile_id,
        body: m.body?.substring(0, 30),
        sender_type: m.sender_type,
      });
    });
  }

  // 4. Check teacher_direct_messages table
  console.log('\n4. Checking teacher_direct_messages table...');
  const { data: teacherDm, error: teacherDmError } = await supabase
    .from('teacher_direct_messages')
    .select('*')
    .limit(10);

  if (teacherDmError) {
    console.log('   ERROR:', teacherDmError.message);
  } else {
    console.log('   Total messages found:', teacherDm?.length || 0);
    teacherDm?.forEach((m, i) => {
      console.log(`   Message ${i + 1}:`, {
        from: m.from_profile_id,
        to: m.to_profile_id,
        body: m.body?.substring(0, 30),
        sender_type: m.sender_type,
      });
    });
  }

  // 5. Check RPC function get_user_conversations
  console.log('\n5. Testing get_user_conversations RPC...');
  if (student?.profile_id) {
    const { data: conversations, error: convError } = await supabase.rpc(
      'get_user_conversations',
      { p_profile_id: student.profile_id, p_limit: 10 }
    );

    if (convError) {
      console.log('   ERROR:', convError.message);
    } else {
      console.log('   Conversations found:', conversations?.length || 0);
      conversations?.forEach((c: any, i: number) => {
        console.log(`   Conversation ${i + 1}:`, {
          partner_profile_id: c.partner_profile_id,
          partner_name: c.partner_name,
          partner_role: c.partner_role,
          last_message: c.last_message_body?.substring(0, 30),
        });
      });
    }
  }

  // 6. Check the available teachers for this student
  console.log('\n6. Checking available teachers...');
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', STUDENT_ID);

  console.log('   Student is enrolled in', enrollments?.length || 0, 'courses');

  if (enrollments?.length) {
    const courseIds = enrollments.map(e => e.course_id);
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select(`
        teacher:teacher_profiles(
          id,
          profile_id,
          profile:school_profiles(full_name)
        )
      `)
      .in('course_id', courseIds);

    console.log('   Teachers found:', assignments?.length || 0);
    const uniqueTeachers = new Map();
    assignments?.forEach((a: any) => {
      if (a.teacher?.id) {
        uniqueTeachers.set(a.teacher.id, {
          teacher_id: a.teacher.id,
          profile_id: a.teacher.profile_id,
          name: a.teacher.profile?.full_name,
        });
      }
    });
    uniqueTeachers.forEach((t) => {
      console.log('   -', t.name, '(profile_id:', t.profile_id + ')');
    });
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
