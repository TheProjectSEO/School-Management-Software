import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createAdminClient } from '../lib/supabase/admin';

async function fix() {
  const supabase = createAdminClient();

  const correctSchoolId = '11111111-1111-1111-1111-111111111111'; // Mindanao State University

  console.log('=== FIXING ADMIN SCHOOL ASSIGNMENTS ===\n');

  // Verify the correct school exists
  const { data: correctSchool } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', correctSchoolId)
    .single();

  if (!correctSchool) {
    console.log('❌ Target school not found:', correctSchoolId);
    return;
  }

  console.log('Target School:', correctSchool.name);
  console.log('Target School ID:', correctSchool.id);

  // Get all admins
  const { data: admins } = await supabase
    .from('admins')
    .select('id, school_id, profile_id');

  if (!admins || admins.length === 0) {
    console.log('No admins found');
    return;
  }

  console.log('\nUpdating', admins.length, 'admin(s)...\n');

  for (const admin of admins) {
    // Update admin school_id
    const { error: adminError } = await supabase
      .from('admins')
      .update({ school_id: correctSchoolId })
      .eq('id', admin.id);

    if (adminError) {
      console.log('❌ Error updating admin:', admin.id, adminError.message);
      continue;
    }

    // Also update the school_profile school_id
    const { error: profileError } = await supabase
      .from('school_profiles')
      .update({ school_id: correctSchoolId })
      .eq('id', admin.profile_id);

    if (profileError) {
      console.log('❌ Error updating school_profile:', admin.profile_id, profileError.message);
    }

    console.log('✅ Updated admin:', admin.id);
  }

  console.log('\n=== VERIFICATION ===\n');

  // Verify update
  const { data: updatedAdmins } = await supabase
    .from('admins')
    .select('id, school_id');

  const allCorrect = updatedAdmins?.every(a => a.school_id === correctSchoolId);
  console.log('All admins in correct school:', allCorrect ? '✅ Yes' : '❌ No');

  // Check section
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, school_id')
    .ilike('name', '%12%STEM%A%')
    .single();

  if (section) {
    console.log('\nSection:', section.name);
    console.log('Section School ID:', section.school_id);
    console.log('Matches Admin School:', section.school_id === correctSchoolId ? '✅ Yes' : '❌ No');
  }
}

fix();
