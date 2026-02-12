/**
 * Student Assessments data access functions
 * Uses admin client to bypass RLS for student data access
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentCourseIds } from "./student";
import type { Assessment, AssessmentSubmission, Course, QueryOptions } from "./types";

/**
 * Get upcoming assessments for a student
 */
export async function getUpcomingAssessments(
  studentId: string,
  limit: number = 10
): Promise<(Assessment & { course: Course; submission?: AssessmentSubmission })[]> {
  const supabase = createAdminClient();

  // Get course IDs (enrollments OR section-based assignments)
  const courseIds = await getStudentCourseIds(studentId);
  if (courseIds.length === 0) return [];

  const now = new Date().toISOString();
  const { data: assessments, error } = await supabase
    .from("assessments")
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .in("course_id", courseIds)
    .eq("status", "published")  // Only show published assessments to students
    .or(`due_date.gte.${now},due_date.is.null`)  // Include upcoming or no due date
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }

  // Get submissions for these assessments
  const assessmentIds = assessments?.map((a) => a.id) || [];
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);

  const submissionMap = new Map(submissions?.map((s) => [s.assessment_id, s]) || []);

  return (
    assessments?.map((a) => ({
      ...a,
      submission: submissionMap.get(a.id),
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

  const submissionMap = new Map(submissions?.map((s) => [s.assessment_id, s]) || []);

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
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .eq("id", assessmentId)
    .eq("status", "published")  // Only allow access to published assessments
    .single();

  if (error) {
    console.error("Error fetching assessment:", error);
    return null;
  }

  return data;
}

/**
 * Get student's submission for an assessment
 */
export async function getAssessmentSubmission(
  assessmentId: string,
  studentId: string
): Promise<AssessmentSubmission | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching submission:", error);
    return null;
  }

  return data;
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

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      *,
      assessment:assessments(
        *,
        course:courses(*)
      )
    `
    )
    .eq("student_id", studentId)
    .eq("status", "graded")
    .order("graded_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error fetching graded assessments:", error);
    return [];
  }

  return data || [];
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
