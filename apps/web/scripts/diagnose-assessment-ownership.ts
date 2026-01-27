import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function diagnose() {
  const supabase = createAdminClient();

  console.log('=== DIAGNOSING ASSESSMENT OWNERSHIP ===\n');

  // 1. Get latest assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, title, created_by, course_id, status')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!assessment) {
    console.log('No assessments found');
    return;
  }

  console.log('1. LATEST ASSESSMENT:');
  console.log('   Title:', assessment.title);
  console.log('   Status:', assessment.status);
  console.log('   Created By:', assessment.created_by || 'NOT SET');
  console.log('   Course ID:', assessment.course_id);

  // 2. Get Felicity's teacher profile
  console.log('\n2. FELICITY TEACHER PROFILE:');
  const felicityTeacherId = '75270e27-9d3d-4b28-ac7c-4677bec6e8e9';

  const { data: felicity } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id')
    .eq('id', felicityTeacherId)
    .single();

  if (felicity) {
    console.log('   Teacher Profile ID:', felicity.id);
    console.log('   School Profile ID:', felicity.profile_id);

    // Check if created_by matches
    if (assessment.created_by === felicity.id) {
      console.log('\n   ✅ Assessment was created by Felicity');
    } else {
      console.log('\n   ❌ MISMATCH: Assessment created_by does NOT match Felicity');
      console.log('      Assessment created_by:', assessment.created_by);
      console.log('      Felicity teacher ID:', felicity.id);

      // Who created it?
      if (assessment.created_by) {
        const { data: creator } = await supabase
          .from('teacher_profiles')
          .select('id, profile_id')
          .eq('id', assessment.created_by)
          .single();

        if (creator) {
          const { data: creatorProfile } = await supabase
            .from('school_profiles')
            .select('full_name')
            .eq('id', creator.profile_id)
            .single();
          console.log('      Actually created by:', creatorProfile?.full_name || 'Unknown');
        }
      }
    }
  }

  // 3. Check questions table
  console.log('\n3. ASSESSMENT QUESTIONS:');
  const { data: questions, error: qErr } = await supabase
    .from('teacher_assessment_questions')
    .select('id, question_text, question_type')
    .eq('assessment_id', assessment.id);

  if (qErr) {
    console.log('   Error fetching questions:', qErr.message);
  } else {
    console.log('   Questions found:', questions?.length || 0);
    questions?.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question_text?.substring(0, 50)}... (${q.question_type})`);
    });
  }

  // 4. Check if course is assigned to Felicity
  console.log('\n4. COURSE OWNERSHIP:');
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('id', assessment.course_id)
    .single();

  if (course) {
    console.log('   Course:', course.name);
    console.log('   Course teacher_id:', course.teacher_id);

    if (course.teacher_id === felicityTeacherId) {
      console.log('   ✅ Course is assigned to Felicity');
    } else {
      console.log('   ❌ Course is NOT assigned to Felicity');
    }
  }

  // 5. Suggest fix
  console.log('\n5. POTENTIAL FIXES:');

  if (assessment.created_by !== felicityTeacherId) {
    console.log('   - Update assessment created_by to Felicity\'s teacher_profile_id');
  }

  if (!assessment.created_by) {
    console.log('   - Assessment has no created_by - needs to be set');
  }
}

diagnose();
