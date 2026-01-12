/**
 * Student data access functions
 */

import { createClient } from "@/lib/supabase/server";
import type { Student, Profile } from "./types";

/**
 * Get current authenticated student
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

  // Get profile first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return null;
  }

  if (!profile) {
    console.warn("Profile not found for user:", user.id, "- User may need to complete onboarding");
    return null;
  }

  // Get student linked to profile
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (studentError) {
    console.error("Error fetching student:", studentError);
    return null;
  }

  if (!student) {
    // Only log at debug level - this is expected for new users before student record is created
    if (process.env.NODE_ENV === "development") {
      console.debug("Student record not found for profile:", profile.id);
    }
    return null;
  }

  return { ...student, profile };
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
