/**
 * Subjects (Courses) and modules data access functions
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { Course, Module, Lesson, Enrollment, Progress, QueryOptions } from "./types";

/**
 * Get all courses/subjects for a student (enrolled or assigned via section)
 */
export async function getStudentSubjects(
  studentId: string,
  options?: QueryOptions
): Promise<(Enrollment & {
  course: Course;
  progress_percent: number;
  total_lessons: number;
  completed_lessons: number;
  total_modules: number;
  teacher_name: string;
})[]> {
  const supabase = createServiceClient();

  // First try enrollments table (flat select — no FK join, BUG-001)
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", studentId)
    .order(options?.orderBy || "created_at", {
      ascending: options?.orderDirection === "asc",
    });

  if (error) {
    console.error("Error fetching subjects:", error);
  }

  // If no enrollments found, check section-based assignments as fallback
  // This handles the case where admin assigned subjects to a section
  // but hasn't explicitly enrolled the students yet
  let enrollmentData = data || [];

  // Fetch courses separately for enrollment-based path (flat — no FK join)
  if (enrollmentData.length > 0) {
    const enrollmentCourseIds = enrollmentData.map((e: any) => e.course_id).filter(Boolean);
    const { data: enrollmentCourses } = await supabase
      .from("courses")
      .select("*")
      .in("id", enrollmentCourseIds);
    const enrollmentCourseMap = new Map((enrollmentCourses || []).map((c: any) => [c.id, c]));
    enrollmentData = enrollmentData.map((e: any) => ({
      ...e,
      course: enrollmentCourseMap.get(e.course_id) || null,
    }));
  }

  if (enrollmentData.length === 0) {
    // Get student's section_id
    const { data: student } = await supabase
      .from("students")
      .select("section_id, school_id")
      .eq("id", studentId)
      .single();

    if (student?.section_id) {
      // Get courses assigned to this section via teacher_assignments
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("id, course_id, teacher_profile_id, section_id")
        .eq("section_id", student.section_id);

      if (assignments && assignments.length > 0) {
        const courseIds = [...new Set(assignments.map((a) => a.course_id))];

        // Fetch the actual course details
        const { data: courses } = await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds);

        const courseMap = new Map((courses || []).map((c) => [c.id, c]));

        // Build synthetic enrollment-like records so the rest of the function works
        enrollmentData = assignments
          .filter((a) => courseMap.has(a.course_id))
          .map((a) => ({
            id: a.id,
            student_id: studentId,
            course_id: a.course_id,
            section_id: a.section_id,
            school_id: student.school_id,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            course: courseMap.get(a.course_id),
          }));
      }
    }
  }

  if (enrollmentData.length === 0) {
    return [];
  }

  // Calculate accurate progress per course:
  // progress = (completed lessons / total published lessons) * 100
  const courseIds = enrollmentData.map((e) => e.course_id).filter(Boolean);

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

  // Map lesson IDs to their course
  const lessonsByCourse = new Map<string, Set<string>>();
  (lessons || []).forEach((l) => {
    const courseId = moduleToCourse.get(l.module_id);
    if (courseId) {
      const set = lessonsByCourse.get(courseId) || new Set();
      set.add(l.id);
      lessonsByCourse.set(courseId, set);
    }
  });

  // Get completed lessons for this student
  const { data: progressData } = await supabase
    .from("student_progress")
    .select("course_id, lesson_id, completed_at")
    .eq("student_id", studentId)
    .not("completed_at", "is", null);

  const completedByCourse = new Map<string, number>();
  (progressData || []).forEach((p) => {
    if (p.lesson_id && lessonsByCourse.get(p.course_id)?.has(p.lesson_id)) {
      completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) || 0) + 1);
    }
  });

  // Count modules per course
  const modulesByCourse = new Map<string, number>();
  (modules || []).forEach((m) => {
    modulesByCourse.set(m.course_id, (modulesByCourse.get(m.course_id) || 0) + 1);
  });

  // Fetch teacher names: courses.teacher_id → teacher_profiles.id → profile_id → school_profiles.full_name
  const teacherIds = [...new Set(enrollmentData.map((e: Record<string, unknown>) => (e.course as Record<string, unknown>)?.teacher_id).filter(Boolean))] as string[];
  const teacherNameMap = new Map<string, string>();

  if (teacherIds.length > 0) {
    const { data: teacherProfiles } = await supabase
      .from("teacher_profiles")
      .select("id, profile_id")
      .in("id", teacherIds);

    if (teacherProfiles && teacherProfiles.length > 0) {
      const profileIds = teacherProfiles.map((tp) => tp.profile_id).filter(Boolean);
      const teacherIdToProfileId = new Map(teacherProfiles.map((tp) => [tp.id, tp.profile_id]));

      const { data: schoolProfiles } = await supabase
        .from("school_profiles")
        .select("id, full_name")
        .in("id", profileIds);

      const profileIdToName = new Map((schoolProfiles || []).map((sp) => [sp.id, sp.full_name]));

      teacherIds.forEach((tid) => {
        const profileId = teacherIdToProfileId.get(tid);
        if (profileId) {
          teacherNameMap.set(tid, profileIdToName.get(profileId) || "");
        }
      });
    }
  }

  return enrollmentData.map((e: Record<string, unknown>) => {
    const courseId = e.course_id as string;
    const course = e.course as Record<string, unknown> | undefined;
    const totalLessons = lessonsByCourse.get(courseId)?.size || 0;
    const completedLessons = completedByCourse.get(courseId) || 0;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return {
      ...e,
      progress_percent: progress,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      total_modules: modulesByCourse.get(courseId) || 0,
      teacher_name: teacherNameMap.get(course?.teacher_id as string) || "",
    };
  }) as ReturnType<typeof getStudentSubjects> extends Promise<infer R> ? R : never;
}

/**
 * Get a single course/subject with its modules
 */
export async function getSubjectWithModules(courseId: string): Promise<
  | (Course & {
      modules: (Module & { lessons: Lesson[] })[];
    })
  | null
> {
  const supabase = createServiceClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    console.error("Error fetching course:", courseError);
    return null;
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("order", { ascending: true });

  if (modulesError) {
    console.error("Error fetching modules:", modulesError);
    return { ...course, modules: [] };
  }

  // Fetch published lessons separately (nested queries don't support filtering)
  const moduleIds = (modules || []).map((m) => m.id);
  let lessonsMap = new Map<string, Lesson[]>();
  if (moduleIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("*")
      .in("module_id", moduleIds)
      .eq("is_published", true)
      .order("order", { ascending: true });

    (lessons || []).forEach((l) => {
      const arr = lessonsMap.get(l.module_id) || [];
      arr.push(l as Lesson);
      lessonsMap.set(l.module_id, arr);
    });
  }

  return {
    ...course,
    modules:
      modules?.map((m) => ({
        ...m,
        lessons: lessonsMap.get(m.id) || [],
      })) || [],
  };
}

/**
 * Get a single module with its lessons
 */
export async function getModuleWithLessons(
  moduleId: string
): Promise<(Module & { lessons: Lesson[]; course: Course }) | null> {
  const supabase = createServiceClient();

  // Fetch module and course separately (no nested FK joins)
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (error || !data) {
    console.error("Error fetching module:", error);
    return null;
  }

  // Fetch course separately
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", data.course_id)
    .single();

  // Fetch only published lessons separately
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order", { ascending: true });

  return {
    ...data,
    lessons: (lessons as Lesson[]) || [],
    course: course as Course,
  };
}

/**
 * Get student's progress for a course
 */
export async function getSubjectProgress(studentId: string, courseId: string): Promise<Progress[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("student_progress")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching progress:", error);
    return [];
  }

  return data || [];
}

/**
 * Update lesson progress
 * Returns { success, error? } so API routes can surface the actual error.
 */
export async function updateLessonProgress(
  studentId: string,
  courseId: string,
  lessonId: string,
  progressPercent: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Use upsert with the UNIQUE(student_id, lesson_id) constraint.
  // This avoids race conditions from concurrent calls (e.g. video player
  // updating progress while user clicks "Mark as Complete").
  const { error: upsertError } = await supabase
    .from("student_progress")
    .upsert(
      {
        student_id: studentId,
        course_id: courseId,
        lesson_id: lessonId,
        progress_percent: progressPercent,
        last_accessed_at: now,
        completed_at: progressPercent >= 100 ? now : null,
      },
      { onConflict: "student_id,lesson_id", ignoreDuplicates: false }
    );

  if (!upsertError) {
    return { success: true };
  }

  // Upsert failed — fall back to select-then-insert/update
  console.error("Upsert failed, trying fallback:", upsertError.message, upsertError.code, upsertError.details);

  // Use .limit(1) instead of .maybeSingle() to handle possible duplicate rows
  const { data: existingRows, error: selectError } = await supabase
    .from("student_progress")
    .select("id")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .limit(1);

  if (selectError) {
    console.error("Error selecting progress:", selectError);
    return { success: false, error: `Select failed: ${selectError.message}` };
  }

  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  if (existing) {
    const { error } = await supabase
      .from("student_progress")
      .update({
        progress_percent: progressPercent,
        last_accessed_at: now,
        completed_at: progressPercent >= 100 ? now : null,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating progress:", error);
      return { success: false, error: `Update failed: ${error.message}` };
    }
  } else {
    const { error } = await supabase.from("student_progress").insert({
      student_id: studentId,
      course_id: courseId,
      lesson_id: lessonId,
      progress_percent: progressPercent,
      last_accessed_at: now,
      completed_at: progressPercent >= 100 ? now : null,
    });

    if (error) {
      console.error("Error inserting progress:", error);
      return { success: false, error: `Insert failed: ${error.message}` };
    }
  }

  return { success: true };
}

/**
 * Get recently accessed courses/subjects
 */
export async function getRecentSubjects(
  studentId: string,
  limit: number = 5
): Promise<(Course & { last_accessed: string; progress_percent: number })[]> {
  const supabase = createServiceClient();

  // Get recently accessed progress rows to find which courses were accessed last
  const { data, error } = await supabase
    .from("student_progress")
    .select("course_id, last_accessed_at")
    .eq("student_id", studentId)
    .order("last_accessed_at", { ascending: false });

  if (error) {
    console.error("Error fetching recent subjects:", error);
    return [];
  }

  // Deduplicate by course_id, keeping the most recent access time
  const courseAccessMap = new Map<string, string>();
  data?.forEach((item) => {
    if (!courseAccessMap.has(item.course_id)) {
      courseAccessMap.set(item.course_id, item.last_accessed_at);
    }
  });

  const recentCourseIds = Array.from(courseAccessMap.keys()).slice(0, limit);
  if (recentCourseIds.length === 0) return [];

  // Fetch course data
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .in("id", recentCourseIds);

  if (!courses || courses.length === 0) return [];

  // Calculate accurate progress per course (same logic as getStudentSubjects)
  const { data: modules } = await supabase
    .from("modules")
    .select("id, course_id")
    .in("course_id", recentCourseIds)
    .eq("is_published", true);

  const moduleIds = (modules || []).map((m) => m.id);
  const moduleToCourse = new Map((modules || []).map((m) => [m.id, m.course_id]));

  const { data: lessons } = moduleIds.length > 0
    ? await supabase
        .from("lessons")
        .select("id, module_id")
        .in("module_id", moduleIds)
        .eq("is_published", true)
    : { data: [] as { id: string; module_id: string }[] };

  const lessonsByCourse = new Map<string, Set<string>>();
  (lessons || []).forEach((l) => {
    const courseId = moduleToCourse.get(l.module_id);
    if (courseId) {
      const set = lessonsByCourse.get(courseId) || new Set();
      set.add(l.id);
      lessonsByCourse.set(courseId, set);
    }
  });

  const { data: progressData } = await supabase
    .from("student_progress")
    .select("course_id, lesson_id, completed_at")
    .eq("student_id", studentId)
    .in("course_id", recentCourseIds)
    .not("completed_at", "is", null);

  const completedByCourse = new Map<string, number>();
  (progressData || []).forEach((p) => {
    if (p.lesson_id && lessonsByCourse.get(p.course_id)?.has(p.lesson_id)) {
      completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) || 0) + 1);
    }
  });

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  return recentCourseIds
    .filter((id) => courseMap.has(id))
    .map((id) => {
      const course = courseMap.get(id)!;
      const totalLessons = lessonsByCourse.get(id)?.size || 0;
      const completedLessons = completedByCourse.get(id) || 0;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      return {
        ...course,
        last_accessed: courseAccessMap.get(id)!,
        progress_percent: progress,
      };
    });
}

/**
 * Get a single subject/course by ID
 */
export async function getSubjectById(courseId: string): Promise<Course | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (error) {
    console.error("Error fetching subject:", error);
    return null;
  }

  return data;
}

/**
 * Get all modules for a subject/course
 */
export async function getModulesBySubject(courseId: string): Promise<Module[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching modules:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single module by ID
 */
export async function getModuleById(moduleId: string): Promise<Module | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (error) {
    console.error("Error fetching module:", error);
    return null;
  }

  return data;
}

/**
 * Get all lessons for a module
 */
export async function getLessonsByModule(moduleId: string): Promise<Lesson[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Fetch attachments separately for all lessons (avoid FK joins - BUG-001)
  const lessonIds = data.map(l => l.id);
  const { data: attachments } = await supabase
    .from('lesson_attachments')
    .select('*')
    .in('lesson_id', lessonIds)
    .order('order_index', { ascending: true });

  // Map attachments to lessons
  const attachmentsByLesson = new Map<string, any[]>();
  (attachments || []).forEach((a: any) => {
    const arr = attachmentsByLesson.get(a.lesson_id) || [];
    arr.push(a);
    attachmentsByLesson.set(a.lesson_id, arr);
  });

  return data.map(lesson => ({
    ...lesson,
    attachments: attachmentsByLesson.get(lesson.id) || []
  }));
}

/**
 * Get a single lesson by ID
 */
export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error) {
    console.error("Error fetching lesson:", error);
    return null;
  }

  // Fetch attachments separately (avoid FK joins - BUG-001)
  const { data: attachments } = await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  return {
    ...data,
    attachments: attachments || []
  };
}

/**
 * Get lesson with progress for a student
 */
export async function getLessonWithProgress(
  lessonId: string,
  studentId: string
): Promise<(Lesson & { progress_percent: number; completed: boolean }) | null> {
  const supabase = createServiceClient();

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    console.error("Error fetching lesson:", lessonError);
    return null;
  }

  // Fetch attachments separately (avoid FK joins - BUG-001)
  const { data: attachments } = await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  // Get progress
  const { data: progress } = await supabase
    .from("student_progress")
    .select("progress_percent, completed_at")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return {
    ...lesson,
    attachments: attachments || [],
    progress_percent: progress?.progress_percent || 0,
    completed: !!progress?.completed_at,
  };
}

/**
 * Mark lesson as complete
 */
export async function markLessonComplete(
  studentId: string,
  courseId: string,
  lessonId: string
): Promise<{ success: boolean; error?: string }> {
  return updateLessonProgress(studentId, courseId, lessonId, 100);
}
