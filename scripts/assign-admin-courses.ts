import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function assignAdminCourses() {
  const supabase = createAdminClient();
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';
  const adminProfileId = '3ece3bac-0209-4207-b07f-e639d201562c'; // admin@gmail.com

  console.log('=== ASSIGNING COURSES TO admin@gmail.com ===\n');

  // 1. Check if admin@gmail.com has a teacher_profile
  console.log('=== 1. FINDING TEACHER PROFILE ===\n');

  // Check by auth_user_id in school_profiles
  const { data: schoolProfile } = await supabase
    .from('school_profiles')
    .select('id, full_name, auth_user_id, role')
    .eq('auth_user_id', adminProfileId)
    .single();

  console.log('School Profile for admin@gmail.com:');
  if (schoolProfile) {
    console.log('  ID:', schoolProfile.id);
    console.log('  Name:', schoolProfile.full_name);
    console.log('  Role:', schoolProfile.role);
  } else {
    console.log('  Not found by auth_user_id');

    // Try searching by name
    const { data: byName } = await supabase
      .from('school_profiles')
      .select('id, full_name, auth_user_id, role')
      .eq('full_name', 'Gabriel B Ignacio')
      .eq('role', 'teacher')
      .single();

    if (byName) {
      console.log('  Found by name:', byName.full_name);
      console.log('  ID:', byName.id);
    }
  }

  // Find teacher_profile linked to admin@gmail.com
  // The auth_user_id in school_profiles matches profiles.id
  // So we need to find school_profile where auth_user_id = adminProfileId
  const { data: adminSchoolProfile } = await supabase
    .from('school_profiles')
    .select('id')
    .eq('auth_user_id', adminProfileId)
    .single();

  let teacherProfileId = null;

  if (adminSchoolProfile) {
    // Find teacher_profile with this school_profile id
    const { data: tp } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', adminSchoolProfile.id)
      .single();

    if (tp) {
      teacherProfileId = tp.id;
      console.log('\n✅ Found teacher_profile:', teacherProfileId);
    }
  }

  // If not found, create one
  if (!teacherProfileId) {
    console.log('\nCreating new teacher_profile for admin@gmail.com...');

    // First ensure there's a school_profile entry
    let profileIdToUse = adminSchoolProfile?.id;

    if (!profileIdToUse) {
      // Create school_profile for admin@gmail.com
      const { data: newSP, error: spError } = await supabase
        .from('school_profiles')
        .insert({
          auth_user_id: adminProfileId,
          full_name: 'Gabriel B Ignacio',
          role: 'teacher',
        })
        .select()
        .single();

      if (spError) {
        console.log('Error creating school_profile:', spError.message);

        // Try using profiles.id directly
        profileIdToUse = adminProfileId;
      } else {
        profileIdToUse = newSP.id;
        console.log('Created school_profile:', profileIdToUse);
      }
    }

    // Create teacher_profile
    const { data: newTP, error: tpError } = await supabase
      .from('teacher_profiles')
      .insert({
        profile_id: profileIdToUse,
        school_id: targetSchoolId,
      })
      .select()
      .single();

    if (tpError) {
      console.log('Error creating teacher_profile:', tpError.message);
    } else {
      teacherProfileId = newTP.id;
      console.log('Created teacher_profile:', teacherProfileId);
    }
  }

  if (!teacherProfileId) {
    console.log('❌ Could not find or create teacher_profile');
    return;
  }

  // 2. Update school_id for teacher
  console.log('\n=== 2. UPDATING TEACHER SCHOOL ===\n');

  const { error: updateError } = await supabase
    .from('teacher_profiles')
    .update({ school_id: targetSchoolId })
    .eq('id', teacherProfileId);

  if (updateError) {
    console.log('Error updating school:', updateError.message);
  } else {
    console.log('✅ Updated teacher school to:', targetSchoolId);
  }

  // 3. Assign all courses to this teacher
  console.log('\n=== 3. ASSIGNING COURSES ===\n');

  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .update({ teacher_id: teacherProfileId })
    .eq('section_id', sectionId)
    .select('id, name');

  if (courseError) {
    console.log('Error assigning courses:', courseError.message);
  } else {
    console.log('✅ Assigned', courses?.length || 0, 'courses to admin@gmail.com');
    courses?.slice(0, 5).forEach(c => console.log('  -', c.name));
    if ((courses?.length || 0) > 5) console.log('  ... and', (courses?.length || 0) - 5, 'more');
  }

  // 4. Set as section adviser
  console.log('\n=== 4. SETTING AS SECTION ADVISER ===\n');

  const { error: adviserError } = await supabase
    .from('sections')
    .update({ adviser_teacher_id: teacherProfileId })
    .eq('id', sectionId);

  if (adviserError) {
    console.log('Error setting adviser:', adviserError.message);
  } else {
    console.log('✅ Set admin@gmail.com as section adviser');
  }

  // 5. Final verification
  console.log('\n=== FINAL VERIFICATION ===\n');

  const { data: section } = await supabase
    .from('sections')
    .select('name, adviser_teacher_id')
    .eq('id', sectionId)
    .single();

  console.log('Section:', section?.name);
  console.log('Adviser Teacher ID:', section?.adviser_teacher_id);

  const { data: assignedCourses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', sectionId);

  console.log('\nCourses assigned to admin@gmail.com (teacher_id=' + teacherProfileId + '):');
  const correctlyAssigned = assignedCourses?.filter(c => c.teacher_id === teacherProfileId) || [];
  console.log('  Correctly assigned:', correctlyAssigned.length, '/', assignedCourses?.length || 0);

  console.log('\n=== DONE ===\n');
  console.log('admin@gmail.com is now assigned to:');
  console.log('  - School: Mindanao State University');
  console.log('  - Section: Grade 12 STEM A (as adviser)');
  console.log('  - Courses:', correctlyAssigned.length, 'subjects');
}

assignAdminCourses();
