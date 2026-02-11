/**
 * Student data access functions
 * Uses admin client to bypass RLS for student data access
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import type { Student, Profile } from "./types";

/**
 * Get current authenticated student
 * Uses JWT-based authentication and SECURITY DEFINER RPC
 */
export async function getCurrentStudent(): Promise<(Student & { profile: Profile }) | null> {
  // Use JWT-based authentication instead of Supabase session
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const supabase = createAdminClient();

  // Use RPC function that bypasses RLS circular dependencies
  const { data, error } = await supabase.rpc("get_current_student_full", {
    p_auth_user_id: currentUser.sub,
  });

  if (error) {
    console.error("Error fetching student via RPC:", error);
    return null;
  }

  if (!data || data.length === 0) {
    // Only log at debug level - this is expected for new users before student record is created
    if (process.env.NODE_ENV === "development") {
      console.debug("Student record not found for user:", currentUser.sub);
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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      profile:school_profiles(*)
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
  const supabase = createAdminClient();

  console.log("Updating profile:", { profileId, updates });

  const { data, error } = await supabase
    .from("school_profiles")
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
 * Calculates accurate per-course progress based on published lessons only,
 * then averages across all enrolled courses.
 */
export async function getStudentProgressStats(studentId: string): Promise<{
  totalCourses: number;
  averageProgress: number;
  completedLessons: number;
  inProgressLessons: number;
}> {
  const supabase = createAdminClient();

  // Get enrolled course IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  const courseIds = (enrollments || []).map((e) => e.course_id).filter(Boolean);
  if (courseIds.length === 0) {
    return { totalCourses: 0, averageProgress: 0, completedLessons: 0, inProgressLessons: 0 };
  }

  // Get published modules for enrolled courses
  const { data: modules } = await supabase
    .from("modules")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("is_published", true);

  const moduleIds = (modules || []).map((m) => m.id);
  const moduleToCourse = new Map((modules || []).map((m) => [m.id, m.course_id]));

  // Get published lessons for those modules
  const { data: lessons } = moduleIds.length > 0
    ? await supabase
        .from("lessons")
        .select("id, module_id")
        .in("module_id", moduleIds)
        .eq("is_published", true)
    : { data: [] as { id: string; module_id: string }[] };

  // Map lessons to their course
  const lessonsByCourse = new Map<string, Set<string>>();
  (lessons || []).forEach((l) => {
    const courseId = moduleToCourse.get(l.module_id);
    if (courseId) {
      const set = lessonsByCourse.get(courseId) || new Set();
      set.add(l.id);
      lessonsByCourse.set(courseId, set);
    }
  });

  // Get completed lessons for this student (only count published lessons)
  const { data: progressData } = await supabase
    .from("student_progress")
    .select("course_id, lesson_id, completed_at, progress_percent")
    .eq("student_id", studentId);

  let totalCompleted = 0;
  let totalInProgress = 0;
  const completedByCourse = new Map<string, number>();

  (progressData || []).forEach((p) => {
    // Only count if the lesson is a published lesson in the course
    if (p.lesson_id && lessonsByCourse.get(p.course_id)?.has(p.lesson_id)) {
      if (p.completed_at) {
        totalCompleted++;
        completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) || 0) + 1);
      } else if (p.progress_percent > 0) {
        totalInProgress++;
      }
    }
  });

  // Calculate per-course progress, then average
  let progressSum = 0;
  courseIds.forEach((cid) => {
    const totalLessons = lessonsByCourse.get(cid)?.size || 0;
    const completed = completedByCourse.get(cid) || 0;
    const courseProgress = totalLessons > 0 ? (completed / totalLessons) * 100 : 0;
    progressSum += courseProgress;
  });

  const averageProgress = courseIds.length > 0 ? progressSum / courseIds.length : 0;

  return {
    totalCourses: courseIds.length,
    averageProgress: Math.round(averageProgress),
    completedLessons: totalCompleted,
    inProgressLessons: totalInProgress,
  };
}

/**
 * Get skill/subject mastery for a student
 */
export async function getStudentSkillMastery(
  studentId: string
): Promise<{ courseId: string; courseName: string; masteryPercent: number }[]> {
  const supabase = createAdminClient();

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
