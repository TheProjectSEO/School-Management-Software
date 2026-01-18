import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentContext,
  StudentProfile,
  CourseProgress,
  ModuleProgress,
  UpcomingAssessment,
  RecentSubmission,
  NotificationSummary,
  LearningStats,
  Recommendation,
} from "./types";

// Cache for student context (5 minute TTL)
const contextCache = new Map<string, { context: StudentContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getStudentContext(
  supabase: SupabaseClient,
  studentId: string,
  options?: {
    includeLesson?: { lessonId: string; courseId: string };
    forceRefresh?: boolean;
  }
): Promise<StudentContext> {
  // Check cache first
  const cacheKey = studentId;
  const cached = contextCache.get(cacheKey);
  if (cached && !options?.forceRefresh && Date.now() - cached.timestamp < CACHE_TTL) {
    // If we need lesson context, add it to cached context
    if (options?.includeLesson) {
      const lessonContext = await getLessonContext(
        supabase,
        options.includeLesson.lessonId,
        options.includeLesson.courseId
      );
      return { ...cached.context, currentLesson: lessonContext };
    }
    return cached.context;
  }

  // Fetch all context in parallel
  const [
    profile,
    courses,
    incompleteModules,
    upcomingAssessments,
    recentSubmissions,
    notifications,
    stats,
  ] = await Promise.all([
    getStudentProfile(supabase, studentId),
    getCourseProgress(supabase, studentId),
    getIncompleteModules(supabase, studentId),
    getUpcomingAssessments(supabase, studentId),
    getRecentSubmissions(supabase, studentId),
    getNotificationSummary(supabase, studentId),
    getLearningStats(supabase, studentId),
  ]);

  // Generate recommendations based on fetched data
  const recommendations = generateRecommendations(
    courses,
    incompleteModules,
    upcomingAssessments,
    stats
  );

  const context: StudentContext = {
    profile,
    courses,
    incompleteModules,
    upcomingAssessments,
    recentSubmissions,
    notifications,
    stats,
    recommendations,
  };

  // Cache the context
  contextCache.set(cacheKey, { context, timestamp: Date.now() });

  // Add lesson context if requested
  if (options?.includeLesson) {
    const lessonContext = await getLessonContext(
      supabase,
      options.includeLesson.lessonId,
      options.includeLesson.courseId
    );
    return { ...context, currentLesson: lessonContext };
  }

  return context;
}

async function getStudentProfile(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentProfile> {
  // Fetch student data with all fields
  const { data: student } = await supabase
    .from("students")
    .select(`
      id,
      grade_level,
      profile_id,
      section_id,
      school_id,
      lrn,
      created_at
    `)
    .eq("id", studentId)
    .single();

  // Initialize all variables
  let profileName = "Student";
  let avatarUrl: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let sectionName: string | null = null;
  let schoolName = "Mindanao State University";
  let accountCreatedAt: Date | null = null;

  // Fetch profile data (name, avatar, phone)
  if (student?.profile_id) {
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("full_name, avatar_url, phone, created_at, auth_user_id")
      .eq("id", student.profile_id)
      .single();

    if (profile) {
      profileName = profile.full_name || "Student";
      avatarUrl = profile.avatar_url;
      phone = profile.phone;
      accountCreatedAt = profile.created_at ? new Date(profile.created_at) : null;

      // Try to get email from auth.users via auth_user_id
      if (profile.auth_user_id) {
        // Note: We can get the current user's email from the auth session
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          email = user.email;
        }
      }
    }
  }

  // Fetch section data
  if (student?.section_id) {
    const { data: section } = await supabase
      .from("sections")
      .select("name")
      .eq("id", student.section_id)
      .single();

    if (section) {
      sectionName = section.name;
    }
  }

  // Fetch school data
  if (student?.school_id) {
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", student.school_id)
      .single();

    if (school) {
      schoolName = school.name;
    }
  }

  // Fetch all enrollments for this student
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, course_id, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  const enrollmentIds = enrollments?.map((e) => e.id) || [];
  const enrolledCourseIds = enrollments?.map((e) => e.course_id).filter(Boolean) || [];

  // Get earliest enrollment date
  const earliestEnrollment = enrollments?.[0];
  const enrollmentDate = earliestEnrollment?.created_at
    ? new Date(earliestEnrollment.created_at)
    : null;

  return {
    // Primary identifiers
    id: studentId,
    studentId: studentId,
    lrn: student?.lrn || null,

    // Personal information
    name: profileName,
    email,
    phone,
    avatarUrl,

    // Academic information
    gradeLevel: student?.grade_level || null,
    section: sectionName,
    sectionId: student?.section_id || null,
    schoolName,
    schoolId: student?.school_id || null,

    // Enrollment information
    enrollmentIds,
    enrolledCourseIds,
    enrollmentDate,

    // Account information
    profileId: student?.profile_id || null,
    accountCreatedAt,
  };
}

async function getCourseProgress(
  supabase: SupabaseClient,
  studentId: string
): Promise<CourseProgress[]> {
  // Get enrolled courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id).filter(Boolean);

  // Fetch course details
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name, subject_code, description")
    .in("id", courseIds);

  // Get modules for these courses
  const { data: modules } = await supabase
    .from("modules")
    .select("id, course_id, title")
    .in("course_id", courseIds)
    .eq("is_published", true);

  // Get lessons for these modules
  const moduleIds = modules?.map((m) => m.id) || [];
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id")
    .in("module_id", moduleIds)
    .eq("is_published", true);

  // Get student progress
  const { data: progress } = await supabase
    .from("student_progress")
    .select("lesson_id, progress_percent, completed_at, last_accessed_at")
    .eq("student_id", studentId);

  // Calculate progress per course
  if (!coursesData) return [];

  return coursesData.map((course) => {
    const courseModules = modules?.filter((m) => m.course_id === course.id) || [];
    const courseLessons = lessons?.filter((l) =>
      courseModules.some((m) => m.id === l.module_id)
    ) || [];
    const courseLessonIds = courseLessons.map((l) => l.id);
    const courseProgress = progress?.filter((p) => courseLessonIds.includes(p.lesson_id)) || [];

    const completedLessons = courseProgress.filter((p) => p.completed_at).length;
    const totalLessons = courseLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Calculate completed modules (all lessons in module completed)
    const completedModules = courseModules.filter((module) => {
      const moduleLessons = courseLessons.filter((l) => l.module_id === module.id);
      const moduleCompletedLessons = courseProgress.filter(
        (p) => p.completed_at && moduleLessons.some((l) => l.id === p.lesson_id)
      );
      return moduleLessons.length > 0 && moduleCompletedLessons.length === moduleLessons.length;
    }).length;

    const lastAccessed = courseProgress
      .filter((p) => p.last_accessed_at)
      .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime())[0];

    return {
      id: course.id,
      name: course.name,
      code: course.subject_code,
      description: course.description,
      progressPercent,
      completedModules,
      totalModules: courseModules.length,
      completedLessons,
      totalLessons,
      lastAccessedAt: lastAccessed?.last_accessed_at ? new Date(lastAccessed.last_accessed_at) : null,
    };
  });
}

async function getIncompleteModules(
  supabase: SupabaseClient,
  studentId: string
): Promise<ModuleProgress[]> {
  // Get enrolled courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);

  // Fetch course names
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name")
    .in("id", courseIds);

  const courseMap = new Map(coursesData?.map((c) => [c.id, c.name]) || []);

  // Get all modules
  const { data: modules } = await supabase
    .from("modules")
    .select("id, course_id, title, order")
    .in("course_id", courseIds)
    .eq("is_published", true)
    .order("order");

  if (!modules || modules.length === 0) return [];

  // Get lessons per module
  const moduleIds = modules.map((m) => m.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id")
    .in("module_id", moduleIds)
    .eq("is_published", true);

  // Get student progress
  const { data: progress } = await supabase
    .from("student_progress")
    .select("lesson_id, completed_at")
    .eq("student_id", studentId);

  // Calculate incomplete modules
  const incompleteModules: ModuleProgress[] = [];

  for (const module of modules) {
    const moduleLessons = lessons?.filter((l) => l.module_id === module.id) || [];
    const moduleLessonIds = moduleLessons.map((l) => l.id);
    const completedLessons = progress?.filter(
      (p) => p.completed_at && moduleLessonIds.includes(p.lesson_id)
    ).length || 0;

    const isCompleted = moduleLessons.length > 0 && completedLessons === moduleLessons.length;

    if (!isCompleted && moduleLessons.length > 0) {
      incompleteModules.push({
        id: module.id,
        title: module.title,
        courseId: module.course_id,
        courseName: courseMap.get(module.course_id) || "Unknown Course",
        progressPercent: Math.round((completedLessons / moduleLessons.length) * 100),
        completedLessons,
        totalLessons: moduleLessons.length,
        isCompleted: false,
        order: module.order,
      });
    }
  }

  // Sort by progress (prioritize partially completed modules)
  return incompleteModules.sort((a, b) => {
    // Prioritize modules with some progress over not started
    if (a.progressPercent > 0 && b.progressPercent === 0) return -1;
    if (b.progressPercent > 0 && a.progressPercent === 0) return 1;
    // Then by order
    return a.order - b.order;
  });
}

async function getUpcomingAssessments(
  supabase: SupabaseClient,
  studentId: string
): Promise<UpcomingAssessment[]> {
  // Get enrolled course IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);

  // Fetch course info
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name, subject_code")
    .in("id", courseIds);

  const courseMap = new Map(coursesData?.map((c) => [c.id, { name: c.name, code: c.subject_code }]) || []);

  // Get assessments with due dates
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, title, type, due_date, total_points, course_id")
    .in("course_id", courseIds)
    .not("due_date", "is", null)
    .order("due_date");

  if (!assessments) return [];

  // Get submissions to filter out already submitted
  const { data: submissions } = await supabase
    .from("submissions")
    .select("assessment_id, status")
    .eq("student_id", studentId);

  const submittedAssessmentIds = submissions
    ?.filter((s) => s.status === "submitted" || s.status === "graded")
    .map((s) => s.assessment_id) || [];

  const now = new Date();

  return assessments
    .filter((a) => !submittedAssessmentIds.includes(a.id))
    .map((assessment) => {
      const dueDate = new Date(assessment.due_date!);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const courseInfo = courseMap.get(assessment.course_id);

      return {
        id: assessment.id,
        title: assessment.title,
        type: assessment.type as "quiz" | "exam" | "assignment" | "project",
        courseName: courseInfo?.name || "Unknown Course",
        courseCode: courseInfo?.code || null,
        dueDate,
        daysUntilDue,
        totalPoints: assessment.total_points,
        isOverdue: daysUntilDue < 0,
      };
    })
    .filter((a) => a.daysUntilDue >= -7) // Include up to 7 days overdue
    .slice(0, 10); // Limit to 10
}

async function getRecentSubmissions(
  supabase: SupabaseClient,
  studentId: string
): Promise<RecentSubmission[]> {
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, score, status, feedback, submitted_at, assessment_id")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(10);

  if (!submissions || submissions.length === 0) return [];

  // Fetch assessment details
  const assessmentIds = submissions.map((s) => s.assessment_id).filter(Boolean);
  const { data: assessmentsData } = await supabase
    .from("assessments")
    .select("id, title, type, total_points, course_id")
    .in("id", assessmentIds);

  // Fetch course names
  const courseIds = [...new Set(assessmentsData?.map((a) => a.course_id).filter(Boolean) || [])];
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, name")
    .in("id", courseIds);

  const courseMap = new Map(coursesData?.map((c) => [c.id, c.name]) || []);
  const assessmentMap = new Map(
    assessmentsData?.map((a) => [
      a.id,
      { title: a.title, type: a.type, totalPoints: a.total_points, courseName: courseMap.get(a.course_id) || "Unknown Course" },
    ]) || []
  );

  return submissions.map((sub) => {
    const assessment = assessmentMap.get(sub.assessment_id);
    return {
      id: sub.id,
      assessmentTitle: assessment?.title || "Unknown Assessment",
      assessmentType: assessment?.type || "assignment",
      courseName: assessment?.courseName || "Unknown Course",
      score: sub.score,
      totalPoints: assessment?.totalPoints || 100,
      percentScore: sub.score !== null && assessment?.totalPoints
        ? Math.round((sub.score / assessment.totalPoints) * 100)
        : null,
      status: sub.status as "pending" | "submitted" | "graded",
      feedback: sub.feedback,
      submittedAt: new Date(sub.submitted_at),
    };
  });
}

async function getNotificationSummary(
  supabase: SupabaseClient,
  studentId: string
): Promise<NotificationSummary> {
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!notifications) {
    return {
      unreadCount: 0,
      totalCount: 0,
      recent: [],
      byType: { announcements: 0, assignments: 0, grades: 0, general: 0 },
    };
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const byType = {
    announcements: notifications.filter((n) => n.type === "announcement").length,
    assignments: notifications.filter((n) => n.type === "assignment").length,
    grades: notifications.filter((n) => n.type === "grade").length,
    general: notifications.filter((n) => !["announcement", "assignment", "grade"].includes(n.type)).length,
  };

  return {
    unreadCount,
    totalCount: notifications.length,
    recent: notifications.slice(0, 5).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      createdAt: new Date(n.created_at),
    })),
    byType,
  };
}

async function getLearningStats(
  supabase: SupabaseClient,
  studentId: string
): Promise<LearningStats> {
  // Get enrollments count
  const { count: coursesEnrolled } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Get progress stats
  const { data: progress } = await supabase
    .from("student_progress")
    .select("completed_at")
    .eq("student_id", studentId);

  const lessonsCompleted = progress?.filter((p) => p.completed_at).length || 0;

  // Get total lessons available
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  let totalLessons = 0;
  let totalModules = 0;

  if (enrollments && enrollments.length > 0) {
    const courseIds = enrollments.map((e) => e.course_id);

    const { data: modules } = await supabase
      .from("modules")
      .select("id")
      .in("course_id", courseIds)
      .eq("is_published", true);

    totalModules = modules?.length || 0;

    if (modules && modules.length > 0) {
      const { count: lessonCount } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .in("module_id", modules.map((m) => m.id))
        .eq("is_published", true);

      totalLessons = lessonCount || 0;
    }
  }

  // Get assessment stats
  const { data: submissions } = await supabase
    .from("submissions")
    .select("score, status, assessment_id")
    .eq("student_id", studentId);

  // Get total points for assessments
  const submissionAssessmentIds = submissions?.map((s) => s.assessment_id).filter(Boolean) || [];
  const { data: assessmentPoints } = await supabase
    .from("assessments")
    .select("id, total_points")
    .in("id", submissionAssessmentIds);

  const pointsMap = new Map(assessmentPoints?.map((a) => [a.id, a.total_points]) || []);

  const gradedSubmissions = submissions?.filter((s) => s.status === "graded" && s.score !== null) || [];
  const averageScore = gradedSubmissions.length > 0
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => {
          const totalPoints = pointsMap.get(s.assessment_id) || 100;
          const percent = (s.score! / totalPoints) * 100;
          return sum + percent;
        }, 0) / gradedSubmissions.length
      )
    : null;

  // Get pending assessments count
  const courseIds = enrollments?.map((e) => e.course_id) || [];
  const { count: pendingAssessments } = await supabase
    .from("assessments")
    .select("id", { count: "exact", head: true })
    .in("course_id", courseIds)
    .gte("due_date", new Date().toISOString());

  // Get notes count
  const { count: notesCount } = await supabase
    .from("student_notes")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Get downloads count
  const { count: downloadsCount } = await supabase
    .from("student_downloads")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  // Calculate modules completed
  const modulesCompleted = 0; // Will be calculated based on lesson completion

  const overallProgress = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

  return {
    overallProgress,
    coursesEnrolled: coursesEnrolled || 0,
    modulesCompleted,
    totalModules,
    lessonsCompleted,
    totalLessons,
    assessmentsPending: pendingAssessments || 0,
    assessmentsCompleted: gradedSubmissions.length,
    averageScore,
    notesCount: notesCount || 0,
    downloadsCount: downloadsCount || 0,
  };
}

function generateRecommendations(
  courses: CourseProgress[],
  incompleteModules: ModuleProgress[],
  upcomingAssessments: UpcomingAssessment[],
  stats: LearningStats
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Priority 1: Overdue assessments
  const overdueAssessments = upcomingAssessments.filter((a) => a.isOverdue);
  for (const assessment of overdueAssessments.slice(0, 2)) {
    recommendations.push({
      type: "assessment",
      priority: "high",
      title: `Complete ${assessment.title}`,
      description: `This ${assessment.type} is overdue by ${Math.abs(assessment.daysUntilDue)} days`,
      courseName: assessment.courseName,
      courseId: "",
      assessmentId: assessment.id,
      reason: "Overdue assessment needs immediate attention",
    });
  }

  // Priority 2: Assessments due within 3 days
  const urgentAssessments = upcomingAssessments.filter(
    (a) => !a.isOverdue && a.daysUntilDue <= 3
  );
  for (const assessment of urgentAssessments.slice(0, 2)) {
    recommendations.push({
      type: "assessment",
      priority: "high",
      title: `Prepare for ${assessment.title}`,
      description: `Due in ${assessment.daysUntilDue} day${assessment.daysUntilDue !== 1 ? "s" : ""}`,
      courseName: assessment.courseName,
      courseId: "",
      assessmentId: assessment.id,
      reason: "Upcoming deadline requires preparation",
    });
  }

  // Priority 3: Continue in-progress modules
  const inProgressModules = incompleteModules.filter(
    (m) => m.progressPercent > 0 && m.progressPercent < 100
  );
  for (const module of inProgressModules.slice(0, 2)) {
    recommendations.push({
      type: "module",
      priority: "medium",
      title: `Continue: ${module.title}`,
      description: `${module.progressPercent}% complete - ${module.totalLessons - module.completedLessons} lessons remaining`,
      courseName: module.courseName,
      courseId: module.courseId,
      moduleId: module.id,
      reason: "Continue where you left off",
    });
  }

  // Priority 4: Start new modules in courses with low progress
  const lowProgressCourses = courses.filter((c) => c.progressPercent < 50);
  for (const course of lowProgressCourses.slice(0, 2)) {
    const courseModules = incompleteModules.filter(
      (m) => m.courseId === course.id && m.progressPercent === 0
    );
    if (courseModules.length > 0) {
      const nextModule = courseModules[0];
      recommendations.push({
        type: "catchup",
        priority: "medium",
        title: `Start: ${nextModule.title}`,
        description: `${course.name} is at ${course.progressPercent}% - catch up!`,
        courseName: course.name,
        courseId: course.id,
        moduleId: nextModule.id,
        reason: "Course needs attention to stay on track",
      });
    }
  }

  // Priority 5: Review weak areas (courses with low average scores)
  // This would require more detailed score tracking per course

  return recommendations.slice(0, 5); // Return top 5 recommendations
}

async function getLessonContext(
  supabase: SupabaseClient,
  lessonId: string,
  courseId: string
): Promise<StudentContext["currentLesson"] | undefined> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, video_url, content, module_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) return undefined;

  // Fetch module details
  let moduleTitle = "Unknown Module";
  let courseName = "Unknown Course";

  if (lesson.module_id) {
    const { data: module } = await supabase
      .from("modules")
      .select("title, course_id")
      .eq("id", lesson.module_id)
      .single();

    if (module) {
      moduleTitle = module.title;

      if (module.course_id) {
        const { data: course } = await supabase
          .from("courses")
          .select("name")
          .eq("id", module.course_id)
          .single();

        if (course) {
          courseName = course.name;
        }
      }
    }
  }

  return {
    id: lesson.id,
    title: lesson.title,
    courseName,
    moduleTitle,
    videoUrl: lesson.video_url,
    transcript: null, // Will be fetched separately if needed
  };
}

// Export helper to clear cache (useful for testing)
export function clearContextCache(studentId?: string) {
  if (studentId) {
    contextCache.delete(studentId);
  } else {
    contextCache.clear();
  }
}
