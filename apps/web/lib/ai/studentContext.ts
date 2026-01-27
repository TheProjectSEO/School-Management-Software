/**
 * Student Context Builder
 * Builds comprehensive context for AI interactions based on student data
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StudentContext,
  StudentProfile,
  CourseContext,
  ModuleContext,
  AssessmentContext,
  LessonContext,
  NotificationContext,
  RecommendationContext,
} from "./types";

/**
 * Options for building student context
 */
interface GetStudentContextOptions {
  includeLesson?: {
    lessonId: string;
    courseId: string;
  };
}

/**
 * Get comprehensive student context for AI interactions
 *
 * @param supabase - Supabase client instance
 * @param studentId - The student's ID
 * @param options - Optional configuration
 * @returns Complete student context for AI
 */
export async function getStudentContext(
  supabase: SupabaseClient,
  studentId: string,
  options?: GetStudentContextOptions
): Promise<StudentContext> {
  // Fetch all data in parallel for performance
  const [
    profileData,
    enrollmentsData,
    assessmentsData,
    progressData,
    notificationsData,
    currentLessonData,
  ] = await Promise.all([
    getStudentProfile(supabase, studentId),
    getStudentEnrollments(supabase, studentId),
    getUpcomingAssessments(supabase, studentId),
    getStudentProgress(supabase, studentId),
    getNotificationSummary(supabase, studentId),
    options?.includeLesson
      ? getCurrentLesson(supabase, studentId, options.includeLesson.lessonId, options.includeLesson.courseId)
      : Promise.resolve(undefined),
  ]);

  // Process courses with progress
  const courses = processCoursesWithProgress(enrollmentsData, progressData);

  // Process incomplete modules
  const incompleteModules = await getIncompleteModules(supabase, studentId, enrollmentsData);

  // Generate recommendations
  const recommendations = generateRecommendations(courses, assessmentsData, incompleteModules);

  // Calculate overall progress
  const overallProgress = calculateOverallProgress(courses);

  return {
    profile: profileData,
    courses,
    upcomingAssessments: assessmentsData,
    incompleteModules,
    notifications: notificationsData,
    recommendations,
    currentLesson: currentLessonData,
    overallProgress,
  };
}

/**
 * Get student profile information
 */
async function getStudentProfile(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentProfile> {
  const { data } = await supabase
    .from("students")
    .select(`
      id,
      grade_level,
      profile:school_profiles(full_name),
      section:sections(name)
    `)
    .eq("id", studentId)
    .single();

  const profile = data?.profile as { full_name?: string } | null;
  const section = data?.section as { name?: string } | null;

  return {
    id: studentId,
    name: profile?.full_name || "Student",
    gradeLevel: data?.grade_level || undefined,
    sectionName: section?.name || undefined,
  };
}

/**
 * Get student enrollments with course details
 */
async function getStudentEnrollments(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ course_id: string; course: { id: string; name: string; subject_code?: string; teacher_id: string } }[]> {
  const { data } = await supabase
    .from("enrollments")
    .select(`
      course_id,
      course:courses(
        id,
        name,
        subject_code,
        teacher_id
      )
    `)
    .eq("student_id", studentId);

  // Filter and map to ensure proper typing
  // Supabase returns course as array, take first element
  const filtered = (data || []).filter(e => e.course);
  return filtered.map(e => {
    const courseData = Array.isArray(e.course) ? e.course[0] : e.course;
    return {
      course_id: e.course_id as string,
      course: courseData as { id: string; name: string; subject_code?: string; teacher_id: string },
    };
  }).filter(e => e.course);
}

/**
 * Get upcoming assessments for student
 */
async function getUpcomingAssessments(
  supabase: SupabaseClient,
  studentId: string
): Promise<AssessmentContext[]> {
  // Get enrolled course IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  const courseIds = enrollments?.map(e => e.course_id) || [];
  if (courseIds.length === 0) return [];

  // Get assessments
  const now = new Date();
  const { data: assessments } = await supabase
    .from("assessments")
    .select(`
      id,
      title,
      type,
      due_date,
      total_points,
      course:courses(id, name)
    `)
    .in("course_id", courseIds)
    .gte("due_date", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Include 7 days overdue
    .order("due_date", { ascending: true })
    .limit(10);

  // Get submissions for these assessments
  const assessmentIds = assessments?.map(a => a.id) || [];
  const { data: submissions } = await supabase
    .from("submissions")
    .select("assessment_id, score, status")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);

  const submissionMap = new Map(submissions?.map(s => [s.assessment_id, s]));

  return (assessments || []).map(a => {
    // Handle course which may be array or single object from Supabase
    const courseData = Array.isArray(a.course) ? a.course[0] : a.course;
    const course = courseData as { id: string; name: string } | null;
    const submission = submissionMap.get(a.id);
    const dueDate = a.due_date ? new Date(a.due_date) : null;
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: a.id,
      title: a.title,
      type: a.type as "quiz" | "exam" | "assignment" | "project",
      courseName: course?.name || "Unknown Course",
      courseId: course?.id || "",
      dueDate: a.due_date || undefined,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      hasSubmission: !!submission,
      score: submission?.score || undefined,
      totalPoints: a.total_points || undefined,
    };
  });
}

/**
 * Get student progress data
 */
async function getStudentProgress(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ course_id: string; lesson_id?: string; progress_percent: number; completed_at?: string }[]> {
  const { data } = await supabase
    .from("student_progress")
    .select("course_id, lesson_id, progress_percent, completed_at")
    .eq("student_id", studentId);

  return data || [];
}

/**
 * Get notification summary
 */
async function getNotificationSummary(
  supabase: SupabaseClient,
  studentId: string
): Promise<NotificationContext> {
  const { data, count } = await supabase
    .from("student_notifications")
    .select("type, created_at", { count: "exact" })
    .eq("student_id", studentId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentTypes = Array.from(new Set((data || []).map(n => n.type)));
  const hasUrgent = recentTypes.includes("error") || recentTypes.includes("warning");

  return {
    unreadCount: count || 0,
    recentTypes,
    hasUrgent,
  };
}

/**
 * Get current lesson context
 */
async function getCurrentLesson(
  supabase: SupabaseClient,
  studentId: string,
  lessonId: string,
  courseId: string
): Promise<LessonContext | undefined> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select(`
      id,
      title,
      content_type,
      module:modules(
        id,
        title,
        course:courses(id, name)
      )
    `)
    .eq("id", lessonId)
    .single();

  if (!lesson) return undefined;

  // Handle module which may be array or single object from Supabase
  const moduleData = Array.isArray(lesson.module) ? lesson.module[0] : lesson.module;
  const module = moduleData as { id: string; title: string; course: unknown } | null;
  // Handle nested course
  const courseData = module?.course;
  const course = (Array.isArray(courseData) ? courseData[0] : courseData) as { id: string; name: string } | null;

  // Get progress
  const { data: progress } = await supabase
    .from("student_progress")
    .select("progress_percent, completed_at")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return {
    id: lesson.id,
    title: lesson.title,
    moduleTitle: module?.title || "Unknown Module",
    courseName: course?.name || "Unknown Course",
    courseId: courseId,
    contentType: lesson.content_type as "video" | "reading" | "quiz" | "activity",
    progressPercent: progress?.progress_percent || 0,
    completed: !!progress?.completed_at,
  };
}

/**
 * Process courses with progress data
 */
function processCoursesWithProgress(
  enrollments: { course_id: string; course: { id: string; name: string; subject_code?: string; teacher_id: string } }[],
  progressData: { course_id: string; lesson_id?: string; progress_percent: number; completed_at?: string }[]
): CourseContext[] {
  return enrollments.map(enrollment => {
    const courseProgress = progressData.filter(p => p.course_id === enrollment.course_id);
    const completedLessons = courseProgress.filter(p => p.completed_at).length;
    const totalLessons = courseProgress.length || 1;
    const averageProgress = courseProgress.length > 0
      ? courseProgress.reduce((sum, p) => sum + p.progress_percent, 0) / courseProgress.length
      : 0;

    return {
      id: enrollment.course.id,
      name: enrollment.course.name,
      code: enrollment.course.subject_code,
      progressPercent: Math.round(averageProgress),
      completedLessons,
      totalLessons,
    };
  });
}

/**
 * Get incomplete modules for student
 */
async function getIncompleteModules(
  supabase: SupabaseClient,
  studentId: string,
  enrollments: { course_id: string; course: { id: string; name: string; subject_code?: string; teacher_id: string } }[]
): Promise<ModuleContext[]> {
  const courseIds = enrollments.map(e => e.course_id);
  if (courseIds.length === 0) return [];

  // Get modules with lesson counts
  const { data: modules } = await supabase
    .from("modules")
    .select(`
      id,
      title,
      course_id,
      lessons(id)
    `)
    .in("course_id", courseIds)
    .eq("is_published", true)
    .order("order", { ascending: true });

  if (!modules) return [];

  // Get progress for lessons
  const { data: progress } = await supabase
    .from("student_progress")
    .select("lesson_id, progress_percent, completed_at")
    .eq("student_id", studentId);

  const progressMap = new Map(progress?.map(p => [p.lesson_id, p]));
  const courseMap = new Map(enrollments.map(e => [e.course_id, e.course]));

  const incompleteModules: ModuleContext[] = [];

  for (const module of modules) {
    const lessons = (module.lessons as { id: string }[]) || [];
    const totalLessons = lessons.length;
    if (totalLessons === 0) continue;

    const completedLessons = lessons.filter(l => progressMap.get(l.id)?.completed_at).length;

    // Only include if not fully completed
    if (completedLessons < totalLessons) {
      const course = courseMap.get(module.course_id);
      const progressPercent = Math.round((completedLessons / totalLessons) * 100);

      incompleteModules.push({
        id: module.id,
        courseId: module.course_id,
        courseName: course?.name || "Unknown Course",
        title: module.title,
        progressPercent,
        completedLessons,
        totalLessons,
      });
    }
  }

  // Sort by progress (in-progress first, then not started)
  return incompleteModules.sort((a, b) => {
    if (a.progressPercent > 0 && b.progressPercent === 0) return -1;
    if (a.progressPercent === 0 && b.progressPercent > 0) return 1;
    return b.progressPercent - a.progressPercent;
  }).slice(0, 10);
}

/**
 * Generate study recommendations based on student data
 */
function generateRecommendations(
  courses: CourseContext[],
  assessments: AssessmentContext[],
  incompleteModules: ModuleContext[]
): RecommendationContext[] {
  const recommendations: RecommendationContext[] = [];

  // Priority 1: Overdue assessments
  assessments
    .filter(a => a.isOverdue && !a.hasSubmission)
    .forEach(a => {
      recommendations.push({
        type: "assessment",
        priority: "high",
        title: a.title,
        courseName: a.courseName,
        courseId: a.courseId,
        assessmentId: a.id,
        reason: "This assessment is overdue",
        description: `${Math.abs(a.daysUntilDue)} day${Math.abs(a.daysUntilDue) !== 1 ? "s" : ""} overdue`,
      });
    });

  // Priority 2: Assessments due soon (within 3 days)
  assessments
    .filter(a => !a.isOverdue && a.daysUntilDue <= 3 && !a.hasSubmission)
    .forEach(a => {
      recommendations.push({
        type: "assessment",
        priority: a.daysUntilDue <= 1 ? "high" : "medium",
        title: a.title,
        courseName: a.courseName,
        courseId: a.courseId,
        assessmentId: a.id,
        reason: "Assessment due soon",
        description: a.daysUntilDue === 0 ? "Due today" : `Due in ${a.daysUntilDue} day${a.daysUntilDue !== 1 ? "s" : ""}`,
      });
    });

  // Priority 3: In-progress modules (to maintain momentum)
  incompleteModules
    .filter(m => m.progressPercent > 0 && m.progressPercent < 100)
    .slice(0, 3)
    .forEach(m => {
      recommendations.push({
        type: "module",
        priority: "medium",
        title: m.title,
        courseName: m.courseName,
        courseId: m.courseId,
        moduleId: m.id,
        reason: "Continue where you left off",
        description: `${m.progressPercent}% complete, ${m.totalLessons - m.completedLessons} lessons remaining`,
      });
    });

  // Priority 4: Courses with low progress (need attention)
  courses
    .filter(c => c.progressPercent < 30)
    .slice(0, 2)
    .forEach(c => {
      recommendations.push({
        type: "review",
        priority: "low",
        title: c.name,
        courseName: c.name,
        courseId: c.id,
        reason: "This course needs more attention",
        description: `Only ${c.progressPercent}% complete`,
      });
    });

  // Limit total recommendations
  return recommendations.slice(0, 8);
}

/**
 * Calculate overall progress metrics
 */
function calculateOverallProgress(courses: CourseContext[]): {
  averagePercent: number;
  totalCourses: number;
  completedCourses: number;
} {
  if (courses.length === 0) {
    return {
      averagePercent: 0,
      totalCourses: 0,
      completedCourses: 0,
    };
  }

  const averagePercent = Math.round(
    courses.reduce((sum, c) => sum + c.progressPercent, 0) / courses.length
  );
  const completedCourses = courses.filter(c => c.progressPercent >= 100).length;

  return {
    averagePercent,
    totalCourses: courses.length,
    completedCourses,
  };
}
