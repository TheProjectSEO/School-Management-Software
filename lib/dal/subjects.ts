/**
 * Subjects (Courses) and modules data access functions
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { Course, Module, Lesson, Enrollment, Progress, QueryOptions } from "./types";

/**
 * Get all courses/subjects for a student (enrolled)
 */
export async function getStudentSubjects(
  studentId: string,
  options?: QueryOptions
): Promise<(Enrollment & { course: Course; progress_percent: number })[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      course:courses(*)
    `)
    .eq("student_id", studentId)
    .order(options?.orderBy || "created_at", {
      ascending: options?.orderDirection === "asc",
    });

  if (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Calculate accurate progress per course:
  // progress = (completed lessons / total published lessons) * 100
  const courseIds = data.map((e) => e.course_id).filter(Boolean);

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

  return data.map((e) => {
    const totalLessons = lessonsByCourse.get(e.course_id)?.size || 0;
    const completedLessons = completedByCourse.get(e.course_id) || 0;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return {
      ...e,
      progress_percent: progress,
    };
  });
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
    .select(`
      *,
      lessons(*)
    `)
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("order", { ascending: true });

  if (modulesError) {
    console.error("Error fetching modules:", modulesError);
    return { ...course, modules: [] };
  }

  return {
    ...course,
    modules:
      modules?.map((m) => ({
        ...m,
        lessons: (m.lessons as Lesson[])?.sort((a, b) => a.order - b.order) || [],
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

  const { data, error } = await supabase
    .from("modules")
    .select(`
      *,
      lessons(*),
      course:courses(*)
    `)
    .eq("id", moduleId)
    .single();

  if (error) {
    console.error("Error fetching module:", error);
    return null;
  }

  return {
    ...data,
    lessons: (data.lessons as Lesson[])?.sort((a, b) => a.order - b.order) || [],
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
 */
export async function updateLessonProgress(
  studentId: string,
  courseId: string,
  lessonId: string,
  progressPercent: number
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("student_progress").upsert(
    {
      student_id: studentId,
      course_id: courseId,
      lesson_id: lessonId,
      progress_percent: progressPercent,
      last_accessed_at: new Date().toISOString(),
      completed_at: progressPercent >= 100 ? new Date().toISOString() : null,
    },
    {
      onConflict: "student_id,lesson_id",
    }
  );

  if (error) {
    console.error("Error updating progress:", error);
    return false;
  }

  return true;
}

/**
 * Get recently accessed courses/subjects
 */
export async function getRecentSubjects(
  studentId: string,
  limit: number = 5
): Promise<(Course & { last_accessed: string; progress_percent: number })[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("student_progress")
    .select(`
      course_id,
      progress_percent,
      last_accessed_at,
      course:courses(*)
    `)
    .eq("student_id", studentId)
    .order("last_accessed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent subjects:", error);
    return [];
  }

  // Deduplicate by course_id
  const uniqueCourses = new Map<string, Course & { last_accessed: string; progress_percent: number }>();
  data?.forEach((item) => {
    if (!uniqueCourses.has(item.course_id) && item.course) {
      const courseData = item.course as unknown as Course;
      uniqueCourses.set(item.course_id, {
        ...courseData,
        last_accessed: item.last_accessed_at,
        progress_percent: item.progress_percent,
      });
    }
  });

  return Array.from(uniqueCourses.values());
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

  return data || [];
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

  return data;
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

  // Get progress
  const { data: progress } = await supabase
    .from("student_progress")
    .select("progress_percent, completed_at")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return {
    ...lesson,
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
): Promise<boolean> {
  return updateLessonProgress(studentId, courseId, lessonId, 100);
}
