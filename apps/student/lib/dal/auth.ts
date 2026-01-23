/**
 * Auth DAL - Get current user profile and role
 */

import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: "student" | "teacher" | "admin";
}

/**
 * Get the current authenticated user's profile and role
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Try to get profile using RPC function (bypasses RLS)
    const { data: roleData, error: roleError } = await supabase.rpc(
      "get_user_role",
      { user_auth_id: user.id }
    );

    if (roleError) {
      console.error("Error getting user role:", roleError);
      // Fallback: try direct query
      return await getProfileFallback(supabase, user.id, user.email || "");
    }

    if (roleData && roleData.length > 0) {
      const userRole = roleData[0];
      return {
        id: userRole.profile_id,
        auth_user_id: user.id,
        full_name: userRole.full_name || user.email || "User",
        email: user.email,
        role: userRole.role,
      };
    }

    // Fallback if RPC returns empty
    return await getProfileFallback(supabase, user.id, user.email || "");
  } catch (error) {
    console.error("Error in getCurrentProfile:", error);
    return null;
  }
}

/**
 * Fallback method to get profile directly from tables
 */
async function getProfileFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
  email: string
): Promise<UserProfile | null> {
  // Try school_profiles first
  const { data: profile, error: profileError } = await supabase
    .from("school_profiles")
    .select("id, auth_user_id, full_name, phone, avatar_url")
    .eq("auth_user_id", authUserId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Check if user is a teacher
  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (teacherProfile) {
    return {
      id: profile.id,
      auth_user_id: authUserId,
      full_name: profile.full_name,
      email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      role: "teacher",
    };
  }

  // Check if user is a student
  const { data: studentProfile } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (studentProfile) {
    return {
      id: profile.id,
      auth_user_id: authUserId,
      full_name: profile.full_name,
      email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      role: "student",
    };
  }

  // Check if user is an admin
  const { data: adminProfile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (adminProfile) {
    return {
      id: profile.id,
      auth_user_id: authUserId,
      full_name: profile.full_name,
      email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      role: "admin",
    };
  }

  // No role found
  return null;
}
