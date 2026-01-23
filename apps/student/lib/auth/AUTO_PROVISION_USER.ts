/**
 * AUTO_PROVISION_USER.ts
 *
 * Automatically provisions user profile and student record on first login.
 * Used for email/password authentication to match OAuth auto-provisioning.
 *
 * @see AUTH_CALLBACK for OAuth provisioning reference
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ProvisionResult {
  success: boolean;
  profileId?: string;
  studentId?: string;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Auto-provision user profile and student record
 *
 * This function:
 * 1. Checks if profile exists for authenticated user
 * 2. If not, creates profile from auth.users metadata
 * 3. Checks if student record exists for profile
 * 4. If not, creates student record linked to default school
 *
 * @param supabase - Supabase client instance
 * @param userId - Auth user ID from auth.users
 * @param userEmail - User email for fallback name generation
 * @param userMetadata - Optional user metadata from auth
 * @returns ProvisionResult with success status and created IDs
 */
export async function autoProvisionUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string,
  userMetadata?: Record<string, any>
): Promise<ProvisionResult> {
  try {
    // Generate full name from metadata or email
    const fullName = userMetadata?.full_name ||
                    userMetadata?.name ||
                    userEmail?.split("@")[0] ||
                    "Student";

    // Use SECURITY DEFINER RPC to bypass RLS circular dependencies
    const { data, error } = await supabase.rpc("auto_provision_student", {
      p_auth_user_id: userId,
      p_full_name: fullName,
      p_avatar_url: userMetadata?.avatar_url || null,
      p_phone: userMetadata?.phone || null,
    });

    if (error) {
      console.error("[Auto-Provision] RPC error:", error);
      return {
        success: false,
        error: `Auto-provision failed: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Auto-provision returned no data",
      };
    }

    const result = data[0];

    if (!result.success) {
      console.error("[Auto-Provision] RPC returned error:", result.error_message);
      return {
        success: false,
        error: result.error_message,
      };
    }

    if (result.is_new_user) {
      console.log(`[Auto-Provision] Created profile ${result.profile_id}, student ${result.student_id} for user ${userId}`);
    }

    return {
      success: true,
      profileId: result.profile_id,
      studentId: result.student_id,
      isNewUser: result.is_new_user,
    };

  } catch (error) {
    console.error("[Auto-Provision] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Enroll student in default courses (optional enhancement)
 *
 * Can be called after autoProvisionUser to enroll new students
 * in default/required courses for their grade level.
 *
 * @param supabase - Supabase client instance
 * @param studentId - Student ID to enroll
 * @param gradeLevel - Optional grade level for course filtering
 */
export async function enrollInDefaultCourses(
  supabase: SupabaseClient,
  studentId: string,
  gradeLevel?: string
): Promise<{ success: boolean; enrolledCount?: number; error?: string }> {
  try {
    // Get default/required courses for the student's school
    const { data: student } = await supabase
      .from("students")
      .select("school_id, section_id")
      .eq("id", studentId)
      .single();

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Get courses for student's section or school
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id")
      .eq("school_id", student.school_id)
      .or(student.section_id ? `section_id.eq.${student.section_id},section_id.is.null` : "section_id.is.null")
      .limit(10);

    if (coursesError) {
      console.error("[Auto-Enroll] Error fetching courses:", coursesError);
      return { success: false, error: coursesError.message };
    }

    if (!courses || courses.length === 0) {
      return { success: true, enrolledCount: 0 };
    }

    // Create enrollments
    const enrollments = courses.map(course => ({
      student_id: studentId,
      course_id: course.id,
    }));

    const { error: enrollError } = await supabase
      .from("student_courses")
      .insert(enrollments);

    if (enrollError) {
      console.error("[Auto-Enroll] Error creating enrollments:", enrollError);
      return { success: false, error: enrollError.message };
    }

    console.log(`[Auto-Enroll] Enrolled student ${studentId} in ${courses.length} courses`);
    return { success: true, enrolledCount: courses.length };

  } catch (error) {
    console.error("[Auto-Enroll] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
