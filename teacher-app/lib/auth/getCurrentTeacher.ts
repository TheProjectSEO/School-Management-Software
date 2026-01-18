/**
 * Get current teacher profile using SECURITY DEFINER RPC
 * This bypasses RLS and correctly handles auth_user_id → profile_id → teacher_id mapping
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface TeacherProfile {
  id: string;
  profile_id: string;
  school_id: string;
  employee_id: string | null;
  department: string | null;
  specialization: string | null;
  is_active: boolean;
}

/**
 * Get current authenticated teacher's profile
 * Uses RPC function to bypass RLS circular dependencies
 */
export async function getCurrentTeacherProfile(
  supabase: SupabaseClient
): Promise<TeacherProfile | null> {
  try {
    // Use SECURITY DEFINER RPC to get teacher ID
    const { data: teacherId, error: rpcError } = await supabase.rpc('get_current_teacher_id');

    if (rpcError || !teacherId) {
      console.error('Error getting teacher ID:', rpcError);
      return null;
    }

    // Fetch full teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching teacher profile:', profileError);
      return null;
    }

    return profile as TeacherProfile;
  } catch (error) {
    console.error('Error in getCurrentTeacherProfile:', error);
    return null;
  }
}

/**
 * Get current teacher ID only (faster)
 * Uses RPC function to bypass RLS
 */
export async function getCurrentTeacherId(
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_current_teacher_id');

    if (error || !data) {
      console.error('Error getting teacher ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentTeacherId:', error);
    return null;
  }
}
