/**
 * Subjects (Courses) and modules data access functions
 */

import { createClient } from "@/lib/supabase/server";
import type { Course, Module, Lesson, Enrollment, Progress, QueryOptions } from "./types";

/**
 * Get all courses/subjects for a student (enrolled)
 */
export async function getStudentSubjects(
  studentId: string,
  options?: QueryOptions
): Promise<(Enrollment & { course: Course; progress_percent: number })[]> {
  const supabase = await createClient();

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

  // Get progress for each course
  const { data: progressData } = await supabase
    .from("student_progress")
    .select("course_id, progress_percent")
    .eq("student_id", studentId);

  const progressMap = new Map(progressData?.map((p) => [p.course_id, p.progress_percent]) || []);

  return (
    data?.map((e) => ({
      ...e,
      progress_percent: progressMap.get(e.course_id) || 0,
    })) || []
  );
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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
