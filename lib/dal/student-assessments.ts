/**
 * Student Assessments data access functions
 * Uses admin client to bypass RLS for student data access
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentCourseIds } from "./student";
import type { Assessment, AssessmentSubmission, Course, QueryOptions } from "./types";

/**
 * Get upcoming assessments for a student, with lock status for module-gated assessments
 */
export async function getUpcomingAssessments(
  studentId: string,
  limit: number = 10
): Promise<(Assessment & { course: Course; submission?: AssessmentSubmission; isLocked: boolean; lockReason?: string })[]> {
  const supabase = createAdminClient();

  // Get course IDs (enrollments OR section-based assignments)
  const courseIds = await getStudentCourseIds(studentId);
  if (courseIds.length === 0) return [];

  const { data: assessments, error } = await supabase
    .from("assessments")
    .select("*")
    .in("course_id", courseIds)
    .eq("status", "published")  // Only show published assessments to students
    // No due-date filter — past-due assessments must remain visible so students can
    // see overdue items and teachers' feedback on submitted work.
    .order("due_date", { ascending: false, nullsFirst: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }

  // Batch-fetch courses separately (BUG-001: no FK joins)
  const uniqueCourseIds = [...new Set((assessments || []).map((a: any) => a.course_id).filter(Boolean))];
  const courseMap = new Map<string, Course>();
  if (uniqueCourseIds.length > 0) {
    const { data: courseRows } = await supabase
      .from("courses")
      .select("*")
      .in("id", uniqueCourseIds);
    (courseRows || []).forEach((c: any) => courseMap.set(c.id, c));
  }

  // Get submissions for these assessments
  const assessmentIds = assessments?.map((a) => a.id) || [];
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);

  // Build submission map preferring graded/submitted over pending.
  // Without this, a newer pending attempt-2 would overwrite the graded attempt-1.
  const submissionMap = new Map<string, AssessmentSubmission>();
  (submissions || []).forEach((s) => {
    const existing = submissionMap.get(s.assessment_id);
    if (!existing || (existing.status === "pending" && s.status !== "pending")) {
      submissionMap.set(s.assessment_id, s);
    }
  });

  // Batch lock computation for module-gated assessments
  const lockMap = new Map<string, { isLocked: boolean; lockReason?: string }>();
  const linkedAssessments = (assessments || []).filter((a: any) => a.lesson_id);

  if (linkedAssessments.length > 0) {
    const lessonIds = [...new Set(linkedAssessments.map((a: any) => a.lesson_id as string))];

    // Batch-fetch module_id for those lessons (flat select — BUG-001 safe)
    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("id, module_id")
      .in("id", lessonIds);

    const lessonToModule = new Map((lessonRows || []).map((l: any) => [l.id, l.module_id]));
    const moduleIds = [...new Set((lessonRows || []).map((l: any) => l.module_id).filter(Boolean))];

    if (moduleIds.length > 0) {
      // Batch-fetch module titles
      const { data: moduleRows } = await supabase
        .from("modules")
        .select("id, title")
        .in("id", moduleIds);
      const moduleMap = new Map((moduleRows || []).map((m: any) => [m.id, m.title]));

      // Batch-fetch all published lessons for those modules
      const { data: allModuleLessons } = await supabase
        .from("lessons")
        .select("id, module_id")
        .in("module_id", moduleIds)
        .eq("status", "published");

      // Group lesson IDs by module_id
      const lessonsByModule = new Map<string, string[]>();
      (allModuleLessons || []).forEach((l: any) => {
        const arr = lessonsByModule.get(l.module_id) || [];
        arr.push(l.id);
        lessonsByModule.set(l.module_id, arr);
      });

      // Batch-fetch student's completed lessons for all module lessons
      const allLessonIds = (allModuleLessons || []).map((l: any) => l.id);
      const { data: completedRows } = allLessonIds.length > 0
        ? await supabase
            .from("student_progress")
            .select("lesson_id")
            .eq("student_id", studentId)
            .in("lesson_id", allLessonIds)
            .not("completed_at", "is", null)
        : { data: [] };

      const completedSet = new Set((completedRows || []).map((r: any) => r.lesson_id));

      // Compute lock status per assessment
      for (const assessment of linkedAssessments) {
        const moduleId = lessonToModule.get((assessment as any).lesson_id);
        if (!moduleId) continue;

        const moduleLessons = lessonsByModule.get(moduleId) || [];
        const total = moduleLessons.length;
        if (total === 0) continue; // No published lessons = no gate

        const completed = moduleLessons.filter((id) => completedSet.has(id)).length;
        if (completed < total) {
          const moduleName = (moduleMap.get(moduleId) as string) || "the module";
          lockMap.set(assessment.id, {
            isLocked: true,
            lockReason: `Complete "${moduleName}" first (${completed}/${total} lessons done)`,
          });
        }
      }
    }
  }

  return (
    assessments?.map((a) => ({
      ...a,
      course: courseMap.get((a as any).course_id) ?? null,
      submission: submissionMap.get(a.id),
      isLocked: lockMap.get(a.id)?.isLocked ?? false,
      lockReason: lockMap.get(a.id)?.lockReason,
    })) || []
  );
}

/**
 * Get all assessments for a course/subject
 */
export async function getCourseAssessments(
  courseId: string,
  studentId: string
): Promise<(Assessment & { submission?: AssessmentSubmission })[]> {
  const supabase = createAdminClient();

  const { data: assessments, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("course_id", courseId)
    .eq("status", "published")  // Only show published assessments to students
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }

  // Get submissions
  const assessmentIds = assessments?.map((a) => a.id) || [];
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);

  // Prefer graded/submitted over pending (same bug-fix as getUpcomingAssessments)
  const submissionMap = new Map<string, AssessmentSubmission>();
  (submissions || []).forEach((s) => {
    const existing = submissionMap.get(s.assessment_id);
    if (!existing || (existing.status === "pending" && s.status !== "pending")) {
      submissionMap.set(s.assessment_id, s);
    }
  });

  return (
    assessments?.map((a) => ({
      ...a,
      submission: submissionMap.get(a.id),
    })) || []
  );
}

// Alias for backwards compatibility
export const getSubjectAssessments = getCourseAssessments;

/**
 * Get a single assessment with course details
 */
export async function getAssessmentById(assessmentId: string): Promise<(Assessment & { course?: Course }) | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .eq("status", "published")  // Only allow access to published assessments
    .single();

  if (error) {
    console.error("Error fetching assessment:", error);
    return null;
  }

  // Fetch course separately (BUG-001: no FK joins)
  let course: Course | undefined
  if ((data as any)?.course_id) {
    const { data: courseRow } = await supabase
      .from("courses")
      .select("*")
      .eq("id", (data as any).course_id)
      .single();
    course = courseRow ?? undefined;
  }

  return { ...data, course };
}

/**
 * Get student's submission for an assessment.
 * Always prefers the most recent graded/submitted submission over a pending one.
 * (PostgreSQL sorts NULL submitted_at first in DESC, so a plain single-query
 * order would return a pending "attempt 2" before a graded "attempt 1".)
 */
export async function getAssessmentSubmission(
  assessmentId: string,
  studentId: string
): Promise<AssessmentSubmission | null> {
  const supabase = createAdminClient();

  // 1. Prefer the most recent completed submission (graded or submitted)
  const { data: completed } = await supabase
    .from("submissions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .in("status", ["graded", "submitted"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completed) return completed;

  // 2. Fall back to a pending submission only when no completed one exists
  const { data: pending, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching submission:", error);
    return null;
  }

  return pending ?? null;
}

/**
 * Submit an assessment
 */
export async function submitAssessment(
  assessmentId: string,
  studentId: string,
  _answers: Record<string, unknown>
): Promise<AssessmentSubmission | null> {
  const supabase = createAdminClient();

  // Check for existing submission to prevent duplicates
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    // Return existing submission instead of creating a duplicate
    return existing as AssessmentSubmission;
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      assessment_id: assessmentId,
      student_id: studentId,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    })
    .select()
    .single();

  if (error) {
    console.error("Error submitting assessment:", error);
    return null;
  }

  return data;
}

/**
 * Get graded assessments for a student
 */
export async function getGradedAssessments(
  studentId: string,
  options?: QueryOptions
): Promise<
  (AssessmentSubmission & {
    assessment: Assessment & { course: Course };
  })[]
> {
  const supabase = createAdminClient();

  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * pageSize;

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "graded")
    .order("graded_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error fetching graded assessments:", error);
    return [];
  }

  if (!submissions?.length) return [];

  // Batch-fetch assessments separately (BUG-001: no FK joins)
  const assessmentIds = [...new Set(submissions.map((s: any) => s.assessment_id).filter(Boolean))];
  const assessmentMap = new Map<string, Assessment & { course?: Course }>();
  if (assessmentIds.length > 0) {
    const { data: assessmentRows } = await supabase
      .from("assessments")
      .select("*")
      .in("id", assessmentIds);

    // Batch-fetch courses separately
    const courseIds = [...new Set((assessmentRows || []).map((a: any) => a.course_id).filter(Boolean))];
    const courseMap = new Map<string, Course>();
    if (courseIds.length > 0) {
      const { data: courseRows } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);
      (courseRows || []).forEach((c: any) => courseMap.set(c.id, c));
    }

    (assessmentRows || []).forEach((a: any) =>
      assessmentMap.set(a.id, { ...a, course: courseMap.get(a.course_id) ?? null })
    );
  }

  return submissions.map((s: any) => ({
    ...s,
    assessment: assessmentMap.get(s.assessment_id) ?? null,
  })) as any;
}

/**
 * Get assessment statistics for a student
 */
export async function getAssessmentStats(studentId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  averageScore: number | null;
}> {
  const supabase = createAdminClient();

  // Get course IDs (enrollments OR section-based assignments)
  const courseIds = await getStudentCourseIds(studentId);

  const { count: total } = await supabase
    .from("assessments")
    .select("*", { count: "exact", head: true })
    .in("course_id", courseIds)
    .eq("status", "published");  // Only count published assessments

  // Get student's submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("score, status")
    .eq("student_id", studentId);

  const completed = submissions?.filter((s) => s.status === "graded").length || 0;
  const pending = submissions?.filter((s) => s.status === "submitted").length || 0;

  const gradedScores = submissions?.filter((s) => s.status === "graded" && s.score !== null) || [];
  const averageScore =
    gradedScores.length > 0
      ? Math.round(gradedScores.reduce((sum, s) => sum + (s.score || 0), 0) / gradedScores.length)
      : null;

  return {
    total: total || 0,
    completed,
    pending,
    averageScore,
  };
}
