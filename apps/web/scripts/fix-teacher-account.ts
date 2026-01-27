import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fixTeacherAccount() {
  const supabase = createAdminClient();
  const teacherEmail = 'admin@gmail.com';
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== FIXING TEACHER ACCOUNT: admin@gmail.com ===\n');

  // 1. Find the auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === teacherEmail);

  if (!authUser) {
    console.log('❌ Auth user not found for:', teacherEmail);
    return;
  }

  console.log('Auth User ID:', authUser.id);
  console.log('Email:', authUser.email);

  // 2. Find their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', teacherEmail)
    .single();

  if (!profile) {
    // Try by auth user id in school_profiles
    const { data: schoolProfile } = await supabase
      .from('school_profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (schoolProfile) {
      console.log('\nFound in school_profiles:');
      console.log('  Profile ID:', schoolProfile.id);
      console.log('  Full Name:', schoolProfile.full_name);
      console.log('  Role:', schoolProfile.role);
    } else {
      console.log('❌ No profile found');
    }
  } else {
    console.log('\nProfile found:');
    console.log('  Profile ID:', profile.id);
    console.log('  Full Name:', profile.full_name);
    console.log('  Role:', profile.role);
  }

  // 3. Check teacher_profiles
  console.log('\n=== TEACHER PROFILE CHECK ===\n');

  // Find by various methods
  const { data: teacherByEmail } = await supabase
    .from('teacher_profiles')
    .select('*, profile:profiles(*)')
    .eq('profiles.email', teacherEmail);

  console.log('Teacher profiles with email join:', teacherByEmail?.length || 0);

  // Get all teacher profiles and check manually
  const { data: allTeachers } = await supabase
    .from('teacher_profiles')
    .select('id, profile_id, school_id');

  console.log('Total teacher profiles:', allTeachers?.length || 0);

  // Check each teacher's profile
  let foundTeacher = null;
  for (const t of allTeachers || []) {
    const { data: tProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', t.profile_id)
      .single();

    if (tProfile?.email === teacherEmail) {
      foundTeacher = { ...t, profile: tProfile };
      break;
    }

    // Also check school_profiles
    const { data: spProfile } = await supabase
      .from('school_profiles')
      .select('email, full_name, auth_user_id')
      .eq('id', t.profile_id)
      .single();

    if (spProfile?.email === teacherEmail || spProfile?.auth_user_id === authUser.id) {
      foundTeacher = { ...t, profile: spProfile };
      break;
    }
  }

  if (foundTeacher) {
    console.log('\n✅ Found teacher profile for admin@gmail.com:');
    console.log('   Teacher ID:', foundTeacher.id);
    console.log('   Profile ID:', foundTeacher.profile_id);
    console.log('   School ID:', foundTeacher.school_id);
    console.log('   Name:', foundTeacher.profile?.full_name);

    // Check if in correct school
    if (foundTeacher.school_id !== targetSchoolId) {
      console.log('\n⚠️  Teacher is in wrong school. Fixing...');

      const { error } = await supabase
        .from('teacher_profiles')
        .update({ school_id: targetSchoolId })
        .eq('id', foundTeacher.id);

      if (error) {
        console.log('❌ Error updating school:', error.message);
      } else {
        console.log('✅ Updated teacher to correct school');
        foundTeacher.school_id = targetSchoolId;
      }
    }

    // Assign this teacher to all Grade 12 STEM A courses
    console.log('\n=== ASSIGNING TO COURSES ===\n');

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, teacher_id')
      .eq('section_id', sectionId);

    console.log('Courses in Grade 12 STEM A:', courses?.length || 0);

    const unassigned = courses?.filter(c => c.teacher_id !== foundTeacher.id) || [];
    console.log('Courses not assigned to this teacher:', unassigned.length);

    if (unassigned.length > 0) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ teacher_id: foundTeacher.id })
        .eq('section_id', sectionId);

      if (updateError) {
        console.log('❌ Error assigning courses:', updateError.message);
      } else {
        console.log('✅ Assigned all', courses?.length, 'courses to admin@gmail.com');
      }
    }

    // Set as section adviser
    console.log('\n=== SETTING AS SECTION ADVISER ===\n');

    const { error: adviserError } = await supabase
      .from('sections')
      .update({ adviser_teacher_id: foundTeacher.id })
      .eq('id', sectionId);

    if (adviserError) {
      console.log('❌ Error setting adviser:', adviserError.message);
    } else {
      console.log('✅ Set as adviser for Grade 12 STEM A');
    }

  } else {
    console.log('\n❌ No teacher profile found for admin@gmail.com');
    console.log('   Need to check if profile exists in correct table');

    // Check school_profiles for this user
    const { data: schoolProfiles } = await supabase
      .from('school_profiles')
      .select('*')
      .or(`email.eq.${teacherEmail},auth_user_id.eq.${authUser.id}`);

    console.log('\n=== SCHOOL_PROFILES CHECK ===');
    console.log('Found:', schoolProfiles?.length || 0);
    schoolProfiles?.forEach(sp => {
      console.log('  ID:', sp.id);
      console.log('  Name:', sp.full_name);
      console.log('  Role:', sp.role);
      console.log('  Auth User ID:', sp.auth_user_id);
    });

    // If found in school_profiles with teacher role, create teacher_profile
    const teacherSchoolProfile = schoolProfiles?.find(sp => sp.role === 'teacher');
    if (teacherSchoolProfile) {
      console.log('\n=== CREATING TEACHER PROFILE ===\n');

      const { data: newTeacher, error: createError } = await supabase
        .from('teacher_profiles')
        .insert({
          profile_id: teacherSchoolProfile.id,
          school_id: targetSchoolId,
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creating teacher profile:', createError.message);
      } else {
        console.log('✅ Created teacher profile:', newTeacher.id);

        // Assign courses
        await supabase
          .from('courses')
          .update({ teacher_id: newTeacher.id })
          .eq('section_id', sectionId);

        console.log('✅ Assigned courses to new teacher profile');

        // Set as adviser
        await supabase
          .from('sections')
          .update({ adviser_teacher_id: newTeacher.id })
          .eq('id', sectionId);

        console.log('✅ Set as section adviser');
      }
    }
  }

  // Final verification
  console.log('\n=== FINAL VERIFICATION ===\n');

  const { data: finalCourses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', sectionId);

  const { data: finalSection } = await supabase
    .from('sections')
    .select('name, adviser_teacher_id')
    .eq('id', sectionId)
    .single();

  console.log('Section:', finalSection?.name);
  console.log('Adviser:', finalSection?.adviser_teacher_id || 'NOT SET');
  console.log('Courses with teacher assigned:', finalCourses?.filter(c => c.teacher_id).length || 0);
  console.log('Total courses:', finalCourses?.length || 0);
}

fixTeacherAccount();
