/**
 * Student Grades Data Access Layer
 *
 * Provides type-safe database queries for student grades, GPA records,
 * and report cards. All queries use the "public" schema.
 *
 * IMPORTANT: Students should only see grades where is_released = true.
 * RLS policies enforce this at the database level.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  CourseGrade,
  SemesterGPA,
  ReportCard,
  GradeSummary,
  GPATrendPoint,
} from "./types/grades";

// Schema name for all grade-related tables
// Note: All tables are in the public schema (default), not a separate schema
// Removed SCHEMA constant - using default public schema

// ============================================================================
// COURSE GRADES
// ============================================================================

/**
 * Get all released course grades for a student
 *
 * Optionally filter by grading period. Returns only grades where
 * is_released = true (enforced by RLS and explicit filter).
 *
 * @param studentId - The student's ID
 * @param gradingPeriodId - Optional filter for specific grading period
 * @returns Array of course grades with course and period details
 */
export async function getStudentCourseGrades(
  studentId: string,
  gradingPeriodId?: string
): Promise<CourseGrade[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("course_grades")
      .select(
        `
        *,
        course:courses(
          id,
          name,
          subject_code
        ),
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .eq("is_released", true) // Explicit filter (RLS also enforces this)
      .order("created_at", { ascending: false });

    if (gradingPeriodId) {
      query = query.eq("grading_period_id", gradingPeriodId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching student course grades:", error);
      return [];
    }

    return (data || []) as CourseGrade[];
  } catch (error) {
    console.error("Unexpected error in getStudentCourseGrades:", error);
    return [];
  }
}

/**
 * Get grade history for a specific course across all grading periods
 *
 * Useful for showing grade progression in a course over time.
 * Only returns released grades.
 *
 * @param studentId - The student's ID
 * @param courseId - The course's ID
 * @returns Array of course grades ordered by grading period
 */
export async function getCourseGradeHistory(
  studentId: string,
  courseId: string
): Promise<CourseGrade[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("course_grades")
      .select(
        `
        *,
        course:courses(
          id,
          name,
          subject_code
        ),
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("is_released", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching course grade history:", error);
      return [];
    }

    return (data || []) as CourseGrade[];
  } catch (error) {
    console.error("Unexpected error in getCourseGradeHistory:", error);
    return [];
  }
}

// ============================================================================
// GPA RECORDS
// ============================================================================

/**
 * Get the most recent GPA record for a student
 *
 * Returns the current/latest semester GPA with cumulative metrics.
 *
 * @param studentId - The student's ID
 * @returns The most recent SemesterGPA record or null
 */
export async function getCurrentGPA(
  studentId: string
): Promise<SemesterGPA | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("semester_gpa")
      .select(
        `
        *,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching current GPA:", error);
      return null;
    }

    return data as SemesterGPA | null;
  } catch (error) {
    console.error("Unexpected error in getCurrentGPA:", error);
    return null;
  }
}

/**
 * Get all GPA records for a student
 *
 * Returns the complete GPA history ordered by most recent first.
 * Useful for displaying GPA trends over time.
 *
 * @param studentId - The student's ID
 * @returns Array of SemesterGPA records
 */
export async function getGPAHistory(studentId: string): Promise<SemesterGPA[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("semester_gpa")
      .select(
        `
        *,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching GPA history:", error);
      return [];
    }

    return (data || []) as SemesterGPA[];
  } catch (error) {
    console.error("Unexpected error in getGPAHistory:", error);
    return [];
  }
}

/**
 * Get GPA trend data for visualization
 *
 * Returns simplified GPA data points for charts, ordered chronologically.
 *
 * @param studentId - The student's ID
 * @returns Array of GPA trend points
 */
export async function getGPATrend(studentId: string): Promise<GPATrendPoint[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("semester_gpa")
      .select(
        `
        grading_period_id,
        term_gpa,
        cumulative_gpa,
        term_credits_earned,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching GPA trend:", error);
      return [];
    }

    return (data || []).map((item: Record<string, unknown>) => ({
      grading_period_id: item.grading_period_id as string,
      period_name:
        (item.grading_period as { name?: string })?.name || "Unknown",
      academic_year:
        (item.grading_period as { academic_year?: string })?.academic_year ||
        "Unknown",
      term_gpa: item.term_gpa as number | undefined,
      cumulative_gpa: item.cumulative_gpa as number | undefined,
      term_credits_earned: item.term_credits_earned as number | undefined,
    })) as GPATrendPoint[];
  } catch (error) {
    console.error("Unexpected error in getGPATrend:", error);
    return [];
  }
}

// ============================================================================
// REPORT CARDS
// ============================================================================

/**
 * Get all released report cards for a student
 *
 * Only returns report cards with status = 'released'.
 * Ordered by most recent first.
 *
 * @param studentId - The student's ID
 * @returns Array of released report cards
 */
export async function getStudentReportCards(
  studentId: string
): Promise<ReportCard[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("report_cards")
      .select(
        `
        *,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .eq("status", "released") // Only show released report cards
      .order("released_at", { ascending: false });

    if (error) {
      console.error("Error fetching student report cards:", error);
      return [];
    }

    return (data || []) as ReportCard[];
  } catch (error) {
    console.error("Unexpected error in getStudentReportCards:", error);
    return [];
  }
}

/**
 * Get a single report card by ID
 *
 * Returns the report card only if it belongs to the student and is released.
 *
 * @param reportCardId - The report card's ID
 * @param studentId - The student's ID (for authorization check)
 * @returns The report card or null if not found/not authorized
 */
export async function getReportCard(
  reportCardId: string,
  studentId: string
): Promise<ReportCard | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("report_cards")
      .select(
        `
        *,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("id", reportCardId)
      .eq("student_id", studentId) // Authorization check
      .eq("status", "released") // Only released report cards
      .maybeSingle();

    if (error) {
      console.error("Error fetching report card:", error);
      return null;
    }

    return data as ReportCard | null;
  } catch (error) {
    console.error("Unexpected error in getReportCard:", error);
    return null;
  }
}

// ============================================================================
// SUMMARY FUNCTIONS
// ============================================================================

/**
 * Get a summary of grades for a specific grading period
 *
 * Provides an overview with grade counts and GPA for the period.
 *
 * @param studentId - The student's ID
 * @param gradingPeriodId - The grading period's ID
 * @returns Grade summary for the period or null
 */
export async function getGradeSummary(
  studentId: string,
  gradingPeriodId: string
): Promise<GradeSummary | null> {
  try {
    const supabase = await createClient();

    // Get course grades for the period
    const { data: grades, error: gradesError } = await supabase
      .from("course_grades")
      .select("id, status, is_released")
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId)
      .eq("is_released", true);

    if (gradesError) {
      console.error("Error fetching grades for summary:", gradesError);
      return null;
    }

    // Get GPA for the period
    const { data: gpaRecord, error: gpaError } = await supabase
      .from("semester_gpa")
      .select(
        `
        term_gpa,
        cumulative_gpa,
        academic_standing,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId)
      .maybeSingle();

    if (gpaError) {
      console.error("Error fetching GPA for summary:", gpaError);
      return null;
    }

    // Get grading period details if GPA record doesn't exist
    let periodName = "Unknown";
    let academicYear = "Unknown";

    if (gpaRecord?.grading_period) {
      const gp = gpaRecord.grading_period as {
        name?: string;
        academic_year?: string;
      };
      periodName = gp.name || "Unknown";
      academicYear = gp.academic_year || "Unknown";
    } else {
      // Fetch period details directly
      const { data: period } = await supabase
          .from("grading_periods")
        .select("name, academic_year")
        .eq("id", gradingPeriodId)
        .maybeSingle();

      if (period) {
        periodName = period.name || "Unknown";
        academicYear = period.academic_year || "Unknown";
      }
    }

    const gradesList = grades || [];

    return {
      grading_period_id: gradingPeriodId,
      period_name: periodName,
      academic_year: academicYear,
      total_courses: gradesList.length,
      courses_graded: gradesList.filter(
        (g) => g.status === "released" || g.status === "finalized"
      ).length,
      term_gpa: gpaRecord?.term_gpa,
      cumulative_gpa: gpaRecord?.cumulative_gpa,
      academic_standing: gpaRecord?.academic_standing,
    };
  } catch (error) {
    console.error("Unexpected error in getGradeSummary:", error);
    return null;
  }
}

/**
 * Get all available grading periods for a student
 *
 * Returns periods where the student has at least one released grade.
 *
 * @param studentId - The student's ID
 * @returns Array of grading periods with basic info
 */
export async function getStudentGradingPeriods(
  studentId: string
): Promise<{ id: string; name: string; academic_year: string }[]> {
  try {
    const supabase = await createClient();

    // Get distinct grading periods from released grades
    const { data, error } = await supabase
      .from("course_grades")
      .select(
        `
        grading_period_id,
        grading_period:grading_periods(
          id,
          name,
          academic_year
        )
      `
      )
      .eq("student_id", studentId)
      .eq("is_released", true);

    if (error) {
      console.error("Error fetching student grading periods:", error);
      return [];
    }

    // Deduplicate and format
    const periodsMap = new Map<
      string,
      { id: string; name: string; academic_year: string }
    >();

    (data || []).forEach((item: Record<string, unknown>) => {
      const gp = item.grading_period as {
        id?: string;
        name?: string;
        academic_year?: string;
      };
      if (gp?.id && !periodsMap.has(gp.id)) {
        periodsMap.set(gp.id, {
          id: gp.id,
          name: gp.name || "Unknown",
          academic_year: gp.academic_year || "Unknown",
        });
      }
    });

    return Array.from(periodsMap.values());
  } catch (error) {
    console.error("Unexpected error in getStudentGradingPeriods:", error);
    return [];
  }
}
