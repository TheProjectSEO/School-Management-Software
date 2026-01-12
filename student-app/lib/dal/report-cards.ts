/**
 * Student Report Cards Data Access Layer
 *
 * Provides server-side data fetching functions for student report cards.
 * Students can only view report cards with status = 'released'.
 *
 * Data source: "school software".report_cards table
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ReportCard,
  ReportCardGrade,
  ReportCardGPA,
  ReportCardAttendance,
  ReportCardStudentInfo,
  TeacherRemark,
  ReportCardStatus,
} from "@/lib/types/report-card";

// Schema name for all report card related tables
// Note: All tables are in the public schema (default), not a separate schema
// Removed SCHEMA constant - using default public schema

// ============================================================================
// MAIN QUERY FUNCTIONS
// ============================================================================

/**
 * Get all released report cards for a student
 *
 * Only returns report cards with status = 'released'.
 * Ordered by release date (most recent first).
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
        id,
        student_id,
        grading_period_id,
        school_id,
        student_info_json,
        grades_snapshot_json,
        gpa_snapshot_json,
        attendance_summary_json,
        teacher_remarks_json,
        status,
        generated_at,
        released_at,
        pdf_url,
        pdf_generated_at,
        created_at,
        updated_at,
        grading_period:grading_periods(
          id,
          name,
          academic_year,
          start_date,
          end_date
        )
      `
      )
      .eq("student_id", studentId)
      .eq("status", "released")
      .order("released_at", { ascending: false });

    if (error) {
      console.error("Error fetching student report cards:", error);
      return [];
    }

    return (data || []).map(transformReportCardData);
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
        id,
        student_id,
        grading_period_id,
        school_id,
        student_info_json,
        grades_snapshot_json,
        gpa_snapshot_json,
        attendance_summary_json,
        teacher_remarks_json,
        status,
        generated_at,
        released_at,
        pdf_url,
        pdf_generated_at,
        created_at,
        updated_at,
        grading_period:grading_periods(
          id,
          name,
          academic_year,
          start_date,
          end_date
        ),
        school:schools(
          id,
          name,
          address,
          logo_url
        )
      `
      )
      .eq("id", reportCardId)
      .eq("student_id", studentId)
      .eq("status", "released")
      .maybeSingle();

    if (error) {
      console.error("Error fetching report card:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return transformReportCardData(data);
  } catch (error) {
    console.error("Unexpected error in getReportCard:", error);
    return null;
  }
}

/**
 * Get the latest released report card for a student
 *
 * @param studentId - The student's ID
 * @returns The most recent released report card or null
 */
export async function getLatestReportCard(
  studentId: string
): Promise<ReportCard | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("report_cards")
      .select(
        `
        id,
        student_id,
        grading_period_id,
        school_id,
        student_info_json,
        grades_snapshot_json,
        gpa_snapshot_json,
        attendance_summary_json,
        teacher_remarks_json,
        status,
        generated_at,
        released_at,
        pdf_url,
        pdf_generated_at,
        created_at,
        updated_at,
        grading_period:grading_periods(
          id,
          name,
          academic_year,
          start_date,
          end_date
        )
      `
      )
      .eq("student_id", studentId)
      .eq("status", "released")
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching latest report card:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return transformReportCardData(data);
  } catch (error) {
    console.error("Unexpected error in getLatestReportCard:", error);
    return null;
  }
}

/**
 * Get report card by grading period
 *
 * @param studentId - The student's ID
 * @param gradingPeriodId - The grading period's ID
 * @returns The report card for that period or null
 */
export async function getReportCardByPeriod(
  studentId: string,
  gradingPeriodId: string
): Promise<ReportCard | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("report_cards")
      .select(
        `
        id,
        student_id,
        grading_period_id,
        school_id,
        student_info_json,
        grades_snapshot_json,
        gpa_snapshot_json,
        attendance_summary_json,
        teacher_remarks_json,
        status,
        generated_at,
        released_at,
        pdf_url,
        pdf_generated_at,
        created_at,
        updated_at,
        grading_period:grading_periods(
          id,
          name,
          academic_year,
          start_date,
          end_date
        )
      `
      )
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId)
      .eq("status", "released")
      .maybeSingle();

    if (error) {
      console.error("Error fetching report card by period:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return transformReportCardData(data);
  } catch (error) {
    console.error("Unexpected error in getReportCardByPeriod:", error);
    return null;
  }
}

/**
 * Get available grading periods with report cards
 *
 * Returns periods where the student has a released report card.
 *
 * @param studentId - The student's ID
 * @returns Array of grading periods
 */
export async function getAvailableReportCardPeriods(
  studentId: string
): Promise<{ id: string; name: string; academic_year: string }[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("report_cards")
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
      .eq("status", "released");

    if (error) {
      console.error("Error fetching available periods:", error);
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
    console.error("Unexpected error in getAvailableReportCardPeriods:", error);
    return [];
  }
}

/**
 * Count total released report cards for a student
 *
 * @param studentId - The student's ID
 * @returns Count of released report cards
 */
export async function countStudentReportCards(studentId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("report_cards")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "released");

    if (error) {
      console.error("Error counting report cards:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Unexpected error in countStudentReportCards:", error);
    return 0;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform raw database data to ReportCard type
 */
function transformReportCardData(data: Record<string, unknown>): ReportCard {
  const gradingPeriod = data.grading_period as {
    id?: string;
    name?: string;
    academic_year?: string;
    start_date?: string;
    end_date?: string;
  } | null;

  const school = data.school as {
    id?: string;
    name?: string;
    address?: string;
    logo_url?: string;
  } | null;

  return {
    id: data.id as string,
    student_id: data.student_id as string,
    grading_period_id: data.grading_period_id as string,
    school_id: data.school_id as string,
    student_info: (data.student_info_json as ReportCardStudentInfo) || {
      full_name: "",
      lrn: "",
      grade_level: "",
      section_name: "",
    },
    grades: (data.grades_snapshot_json as ReportCardGrade[]) || [],
    gpa: (data.gpa_snapshot_json as ReportCardGPA) || {
      term_gpa: 0,
      cumulative_gpa: 0,
      term_credits: 0,
      cumulative_credits: 0,
      academic_standing: "good_standing",
    },
    attendance: (data.attendance_summary_json as ReportCardAttendance) || {
      total_days: 0,
      present_days: 0,
      absent_days: 0,
      late_days: 0,
      excused_days: 0,
      attendance_rate: 0,
    },
    teacher_remarks: (data.teacher_remarks_json as TeacherRemark[]) || [],
    status: data.status as ReportCardStatus,
    generated_at: data.generated_at as string,
    released_at: data.released_at as string | undefined,
    pdf_url: data.pdf_url as string | undefined,
    created_at: data.created_at as string | undefined,
    updated_at: data.updated_at as string | undefined,
    grading_period: gradingPeriod
      ? {
          id: gradingPeriod.id || "",
          name: gradingPeriod.name || "Unknown",
          academic_year: gradingPeriod.academic_year || "Unknown",
          start_date: gradingPeriod.start_date,
          end_date: gradingPeriod.end_date,
        }
      : undefined,
    school: school
      ? {
          id: school.id || "",
          name: school.name || "Unknown",
          address: school.address,
          logo_url: school.logo_url,
        }
      : undefined,
  };
}

// Re-export types for convenience
export type {
  ReportCard,
  ReportCardGrade,
  ReportCardGPA,
  ReportCardAttendance,
  ReportCardStudentInfo,
  TeacherRemark,
  ReportCardStatus,
} from "@/lib/types/report-card";
