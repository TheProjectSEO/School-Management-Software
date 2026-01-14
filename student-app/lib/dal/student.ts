/**
 * Student data access functions
 */

import { createClient } from "@/lib/supabase/server";
import type { Student, Profile } from "./types";

/**
 * Get current authenticated student
 * Uses SECURITY DEFINER RPC to bypass RLS circular dependencies
 */
export async function getCurrentStudent(): Promise<(Student & { profile: Profile }) | null> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use RPC function that bypasses RLS circular dependencies
  const { data, error } = await supabase.rpc("get_current_student_full", {
    p_auth_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching student via RPC:", error);
    return null;
  }

  if (!data || data.length === 0) {
    // Only log at debug level - this is expected for new users before student record is created
    if (process.env.NODE_ENV === "development") {
      console.debug("Student record not found for user:", user.id);
    }
    return null;
  }

  const row = data[0];

  // Reconstruct the profile object
  const profile: Profile = {
    id: row.profile_id,
    auth_user_id: row.profile_auth_user_id,
    full_name: row.full_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    created_at: row.profile_created_at,
    updated_at: row.profile_updated_at,
  };

  // Reconstruct the student object with profile
  // Note: Using correct column names that match actual DB schema
  const student: Student & { profile: Profile } = {
    id: row.student_id,
    profile_id: row.profile_id,
    school_id: row.school_id,
    section_id: row.section_id,
    lrn: row.lrn,
    grade_level: row.grade_level,
    created_at: row.student_created_at,
    updated_at: row.student_updated_at,
    profile,
  };

  return student;
}

/**
 * Get student by ID
 */
export async function getStudentById(
  studentId: string
): Promise<(Student & { profile: Profile }) | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching student by ID:", error);
    return null;
  }

  if (!data) {
    console.warn("Student not found for ID:", studentId);
    return null;
  }

  return data;
}

/**
 * Update student profile
 */
export async function updateStudentProfile(
  profileId: string,
  updates: Partial<Pick<Profile, "full_name" | "phone" | "avatar_url">>
): Promise<Profile | null> {
  const supabase = await createClient();

  console.log("Updating profile:", { profileId, updates });

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating profile:", {
      error,
      profileId,
      updates,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
    });
    return null;
  }

  if (!data) {
    console.warn("Profile not found for update:", profileId);
    return null;
  }

  console.log("Profile updated successfully:", data);
  return data;
}

/**
 * Get overall progress stats for a student
 */
export async function getStudentProgressStats(studentId: string): Promise<{
  totalCourses: number;
  averageProgress: number;
  completedLessons: number;
  inProgressLessons: number;
}> {
  const supabase = await createClient();

  // Get enrollments count
  const { count: totalCourses } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Get progress data
  const { data: progressData } = await supabase
    .from("student_progress")
    .select("progress_percent, completed_at")
    .eq("student_id", studentId);

  const completedLessons = progressData?.filter((p) => p.completed_at)?.length || 0;
  const inProgressLessons = progressData?.filter((p) => !p.completed_at && p.progress_percent > 0)?.length || 0;
  const averageProgress =
    progressData && progressData.length > 0
      ? progressData.reduce((sum, p) => sum + p.progress_percent, 0) / progressData.length
      : 0;

  return {
    totalCourses: totalCourses || 0,
    averageProgress: Math.round(averageProgress),
    completedLessons,
    inProgressLessons,
  };
}

/**
 * Get skill/subject mastery for a student
 */
export async function getStudentSkillMastery(
  studentId: string
): Promise<{ courseId: string; courseName: string; masteryPercent: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      course_id,
      course:courses(name)
    `)
    .eq("student_id", studentId);

  if (error) {
    console.error("Error fetching skill mastery:", error);
    return [];
  }

  // Get progress for each course
  const results = await Promise.all(
    (data || []).map(async (enrollment) => {
      const { data: progressData } = await supabase
        .from("student_progress")
        .select("progress_percent")
        .eq("student_id", studentId)
        .eq("course_id", enrollment.course_id);

      const avgProgress =
        progressData && progressData.length > 0
          ? progressData.reduce((sum, p) => sum + p.progress_percent, 0) / progressData.length
          : 0;

      const courseData = enrollment.course as unknown as { name: string };
      return {
        courseId: enrollment.course_id,
        courseName: courseData?.name || "Unknown",
        masteryPercent: Math.round(avgProgress),
      };
    })
  );

  return results;
}
