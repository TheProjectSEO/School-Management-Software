import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fixAdminTeacher() {
  const supabase = createAdminClient();
  const targetSchoolId = '11111111-1111-1111-1111-111111111111';
  const sectionId = '1c4ca13d-cba8-4219-be47-61bb652c5d4a';

  console.log('=== FIXING ADMIN TEACHER ACCOUNT ===\n');

  // 1. Find admin@gmail.com in profiles
  console.log('=== 1. SEARCHING FOR admin@gmail.com ===\n');

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@gmail.com')
    .single();

  if (adminProfile) {
    console.log('✅ Found admin@gmail.com in profiles table:');
    console.log('   ID:', adminProfile.id);
    console.log('   Name:', adminProfile.full_name);
    console.log('   Email:', adminProfile.email);
  } else {
    console.log('❌ admin@gmail.com NOT found in profiles table');

    // List all profiles to find it
    console.log('\nAll profiles with emails:');
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null)
      .limit(20);

    allProfiles?.forEach(p => {
      console.log(`  - ${p.email} | ${p.full_name}`);
    });

    // Check if it might be in a different format
    const { data: adminLike } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', '%admin%');

    if (adminLike?.length) {
      console.log('\nProfiles with "admin" in email:');
      adminLike.forEach(p => {
        console.log(`  - ${p.email} | ${p.full_name}`);
      });
    }
  }

  // 2. Check school_profiles structure
  console.log('\n=== 2. SCHOOL_PROFILES STRUCTURE ===\n');

  const { data: spSample } = await supabase
    .from('school_profiles')
    .select('*')
    .limit(1)
    .single();

  if (spSample) {
    console.log('Columns in school_profiles:');
    Object.keys(spSample).forEach(k => {
      console.log(`  - ${k}: ${typeof spSample[k]}`);
    });
  }

  // 3. Find teachers by their school_profiles (if that's how it works)
  console.log('\n=== 3. FINDING TEACHER SCHOOL_PROFILES ===\n');

  const { data: teacherSchoolProfiles } = await supabase
    .from('school_profiles')
    .select('*')
    .eq('role', 'teacher')
    .limit(5);

  console.log('Teachers in school_profiles:', teacherSchoolProfiles?.length || 0);
  teacherSchoolProfiles?.forEach(p => {
    console.log(`  ID: ${p.id}`);
    console.log(`  Name: ${p.full_name}`);
    console.log(`  Auth User ID: ${p.auth_user_id}`);
    console.log(`  School ID: ${p.school_id}`);
    console.log('');
  });

  // 4. If we found teacher school_profiles, link them to teacher_profiles
  if (teacherSchoolProfiles?.length) {
    console.log('=== 4. LINKING TEACHER PROFILES ===\n');

    for (const sp of teacherSchoolProfiles) {
      // Check if already has teacher_profile
      const { data: existing } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('profile_id', sp.id)
        .single();

      if (existing) {
        console.log(`✅ ${sp.full_name} already has teacher_profile: ${existing.id}`);

        // Ensure correct school
        await supabase
          .from('teacher_profiles')
          .update({ school_id: targetSchoolId })
          .eq('id', existing.id);
      } else {
        // Create teacher_profile
        const { data: newTeacher, error } = await supabase
          .from('teacher_profiles')
          .insert({
            profile_id: sp.id,
            school_id: targetSchoolId,
          })
          .select()
          .single();

        if (error) {
          console.log(`❌ Error creating teacher_profile for ${sp.full_name}:`, error.message);
        } else {
          console.log(`✅ Created teacher_profile for ${sp.full_name}: ${newTeacher.id}`);
        }
      }
    }
  }

  // 5. Assign the first valid teacher to courses
  console.log('\n=== 5. ASSIGNING TEACHER TO COURSES ===\n');

  // Get teacher with valid profile
  const { data: validTeachers } = await supabase
    .from('teacher_profiles')
    .select(`
      id,
      profile_id,
      school_id
    `)
    .eq('school_id', targetSchoolId);

  let assignedTeacher = null;

  for (const t of validTeachers || []) {
    // Check if profile exists in school_profiles
    const { data: sp } = await supabase
      .from('school_profiles')
      .select('full_name, role')
      .eq('id', t.profile_id)
      .single();

    if (sp && sp.role === 'teacher') {
      assignedTeacher = { ...t, name: sp.full_name };
      break;
    }
  }

  if (assignedTeacher) {
    console.log('Using teacher:', assignedTeacher.name);
    console.log('Teacher ID:', assignedTeacher.id);

    // Assign to all courses in section
    const { error: courseError } = await supabase
      .from('courses')
      .update({ teacher_id: assignedTeacher.id })
      .eq('section_id', sectionId);

    if (courseError) {
      console.log('❌ Error assigning courses:', courseError.message);
    } else {
      console.log('✅ Assigned all courses to this teacher');
    }

    // Set as section adviser
    const { error: adviserError } = await supabase
      .from('sections')
      .update({ adviser_teacher_id: assignedTeacher.id })
      .eq('id', sectionId);

    if (adviserError) {
      console.log('❌ Error setting adviser:', adviserError.message);
    } else {
      console.log('✅ Set as section adviser');
    }
  } else {
    console.log('❌ No valid teacher found with profile in school_profiles');

    // Create a new teacher profile linked to a profiles table user
    console.log('\nCreating teacher profile from profiles table...');

    const { data: profileWithEmail } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null)
      .limit(1)
      .single();

    if (profileWithEmail) {
      console.log('Using profile:', profileWithEmail.email);

      // Check if teacher_profile exists for this profile
      const { data: existingTP } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('profile_id', profileWithEmail.id)
        .single();

      let teacherId;
      if (existingTP) {
        teacherId = existingTP.id;
        console.log('Found existing teacher_profile:', teacherId);
      } else {
        const { data: newTP, error: tpError } = await supabase
          .from('teacher_profiles')
          .insert({
            profile_id: profileWithEmail.id,
            school_id: targetSchoolId,
          })
          .select()
          .single();

        if (tpError) {
          console.log('Error creating teacher_profile:', tpError.message);
        } else {
          teacherId = newTP.id;
          console.log('Created teacher_profile:', teacherId);
        }
      }

      if (teacherId) {
        // Assign courses
        await supabase
          .from('courses')
          .update({ teacher_id: teacherId })
          .eq('section_id', sectionId);

        // Set adviser
        await supabase
          .from('sections')
          .update({ adviser_teacher_id: teacherId })
          .eq('id', sectionId);

        console.log('✅ Assigned courses and set as adviser');
      }
    }
  }

  // 6. Final verification
  console.log('\n=== FINAL VERIFICATION ===\n');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, teacher_id')
    .eq('section_id', sectionId)
    .limit(5);

  console.log('Sample courses:');
  for (const c of courses || []) {
    let teacherName = 'N/A';
    if (c.teacher_id) {
      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('profile_id')
        .eq('id', c.teacher_id)
        .single();

      if (tp) {
        const { data: sp } = await supabase
          .from('school_profiles')
          .select('full_name')
          .eq('id', tp.profile_id)
          .single();

        const { data: p } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', tp.profile_id)
          .single();

        teacherName = sp?.full_name || p?.full_name || 'Unknown';
      }
    }
    console.log(`  ${c.name} → Teacher: ${teacherName}`);
  }
}

fixAdminTeacher();
