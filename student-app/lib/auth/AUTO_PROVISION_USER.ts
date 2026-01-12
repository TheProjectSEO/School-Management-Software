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
    // Step 1: Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error("[Auto-Provision] Error checking profile:", profileCheckError);
      return {
        success: false,
        error: `Profile check failed: ${profileCheckError.message}`,
      };
    }

    let profileId = existingProfile?.id;
    let isNewUser = false;

    // Step 2: Create profile if it doesn't exist
    if (!existingProfile) {
      isNewUser = true;

      // Generate full name from metadata or email
      const fullName = userMetadata?.full_name ||
                      userMetadata?.name ||
                      userEmail?.split("@")[0] ||
                      "Student";

      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          auth_user_id: userId,
          full_name: fullName,
          avatar_url: userMetadata?.avatar_url || null,
          phone: userMetadata?.phone || null,
        })
        .select("id")
        .single();

      if (profileError) {
        console.error("[Auto-Provision] Error creating profile:", profileError);
        return {
          success: false,
          error: `Profile creation failed: ${profileError.message}`,
        };
      }

      profileId = newProfile.id;
      console.log(`[Auto-Provision] Created profile ${profileId} for user ${userId}`);
    }

    // Step 3: Check if student record exists
    const { data: existingStudent, error: studentCheckError } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (studentCheckError) {
      console.error("[Auto-Provision] Error checking student:", studentCheckError);
      // Don't fail completely, profile exists
      return {
        success: true,
        profileId,
        isNewUser,
        error: `Student check failed: ${studentCheckError.message}`,
      };
    }

    let studentId = existingStudent?.id;

    // Step 4: Create student record if it doesn't exist
    if (!existingStudent && profileId) {
      // Get the default school (MSU)
      const { data: defaultSchool, error: schoolError } = await supabase
        .from("schools")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (schoolError || !defaultSchool) {
        // Don't log as error - schools may not be set up yet
        // Only log in development for debugging
        if (process.env.NODE_ENV === "development") {
          console.debug("[Auto-Provision] No default school found - student record will be created when school is added");
        }
        // Profile exists, so partial success
        return {
          success: true,
          profileId,
          isNewUser,
          error: "Default school not found, student record not created",
        };
      }

      const { data: newStudent, error: studentError } = await supabase
        .from("students")
        .insert({
          school_id: defaultSchool.id,
          profile_id: profileId,
          lrn: null,
          grade_level: null,
          section_id: null,
        })
        .select("id")
        .single();

      if (studentError) {
        console.error("[Auto-Provision] Error creating student:", studentError);
        // Profile exists, so partial success
        return {
          success: true,
          profileId,
          isNewUser,
          error: `Student creation failed: ${studentError.message}`,
        };
      }

      studentId = newStudent.id;
      console.log(`[Auto-Provision] Created student ${studentId} for profile ${profileId}`);
    }

    // Success - all records exist or were created
    return {
      success: true,
      profileId,
      studentId,
      isNewUser,
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
