/**
 * Teacher Report Cards Data Access Layer
 *
 * Provides server-side data fetching functions for teacher report card management.
 * Teachers can view all report cards for their assigned sections and courses,
 * add remarks, and submit for review.
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
  ReportCardFilters,
  ReportCardListItem,
  SectionReportCardSummary,
  AddTeacherRemarksInput,
} from "@/lib/types/report-card";

// Schema name for all report card related tables
const SCHEMA = "school software";

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all report cards for a teacher's sections
 *
 * Returns report cards for students in sections where the teacher teaches.
 *
 * @param teacherId - The teacher profile ID
 * @param filters - Optional filters for status, period, section
 * @returns Array of report cards
 */
export async function getTeacherReportCards(
  teacherId: string,
  filters?: ReportCardFilters
): Promise<ReportCard[]> {
  try {
    const supabase = await createClient();

    // First, get sections where teacher has assignments
    const { data: teacherSections, error: sectionsError } = await supabase
      .schema(SCHEMA)
      .from("teacher_course_assignments")
      .select("section_id")
      .eq("teacher_id", teacherId)
      .eq("is_active", true);

    if (sectionsError || !teacherSections?.length) {
      console.error("Error fetching teacher sections:", sectionsError);
      return [];
    }

    const sectionIds = Array.from(new Set(teacherSections.map((s) => s.section_id)));

    // Build query for report cards
    let query = supabase
      .schema(SCHEMA)
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
        generated_by,
        approved_at,
        approved_by,
        released_at,
        released_by,
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
        student:students(
          id,
          lrn,
          section_id,
          section:sections(
            id,
            name,
            grade_level
          ),
          profile:profiles(
            full_name,
            avatar_url
          )
        )
      `
      )
      .order("generated_at", { ascending: false });

    // Apply filters
    if (filters?.section_id) {
      // Get students in specific section
      const { data: sectionStudents } = await supabase
        .schema(SCHEMA)
        .from("students")
        .select("id")
        .eq("section_id", filters.section_id);

      if (sectionStudents?.length) {
        query = query.in(
          "student_id",
          sectionStudents.map((s) => s.id)
        );
      }
    } else {
      // Get students in all teacher's sections
      const { data: allStudents } = await supabase
        .schema(SCHEMA)
        .from("students")
        .select("id")
        .in("section_id", sectionIds);

      if (allStudents?.length) {
        query = query.in(
          "student_id",
          allStudents.map((s) => s.id)
        );
      }
    }

    if (filters?.grading_period_id) {
      query = query.eq("grading_period_id", filters.grading_period_id);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.student_id) {
      query = query.eq("student_id", filters.student_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching teacher report cards:", error);
      return [];
    }

    return (data || []).map(transformReportCardData);
  } catch (error) {
    console.error("Unexpected error in getTeacherReportCards:", error);
    return [];
  }
}

/**
 * Get report cards list for a specific section
 *
 * @param sectionId - The section ID
 * @param gradingPeriodId - Optional grading period filter
 * @returns Array of report card list items
 */
export async function getSectionReportCardsList(
  sectionId: string,
  gradingPeriodId?: string
): Promise<ReportCardListItem[]> {
  try {
    const supabase = await createClient();

    // Get students in section
    const { data: students } = await supabase
      .schema(SCHEMA)
      .from("students")
      .select("id")
      .eq("section_id", sectionId);

    if (!students?.length) {
      return [];
    }

    let query = supabase
      .schema(SCHEMA)
      .from("report_cards")
      .select(
        `
        id,
        student_id,
        student_info_json,
        gpa_snapshot_json,
        attendance_summary_json,
        teacher_remarks_json,
        status,
        generated_at,
        pdf_url,
        student:students(
          id,
          lrn,
          section:sections(name, grade_level),
          profile:profiles(full_name, avatar_url)
        )
      `
      )
      .in(
        "student_id",
        students.map((s) => s.id)
      )
      .order("generated_at", { ascending: false });

    if (gradingPeriodId) {
      query = query.eq("grading_period_id", gradingPeriodId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching section report cards list:", error);
      return [];
    }

    return (data || []).map((item) => {
      const studentInfo = item.student_info_json as ReportCardStudentInfo;
      const gpa = item.gpa_snapshot_json as ReportCardGPA;
      const attendance = item.attendance_summary_json as ReportCardAttendance;
      const remarks = item.teacher_remarks_json as TeacherRemark[];
      const student = item.student as unknown as Record<string, unknown>;
      const section = student?.section as { name?: string; grade_level?: string };
      const profile = student?.profile as { full_name?: string; avatar_url?: string };

      return {
        id: item.id as string,
        student_id: item.student_id as string,
        student_name: studentInfo?.full_name || profile?.full_name || "Unknown",
        student_lrn: studentInfo?.lrn || (student?.lrn as string) || "",
        student_avatar: profile?.avatar_url,
        section_name: studentInfo?.section_name || section?.name || "",
        grade_level: studentInfo?.grade_level || section?.grade_level || "",
        term_gpa: gpa?.term_gpa || 0,
        attendance_rate: attendance?.attendance_rate || 0,
        status: item.status as ReportCardStatus,
        generated_at: item.generated_at as string,
        has_remarks: (remarks?.length || 0) > 0,
        has_pdf: !!item.pdf_url,
      };
    });
  } catch (error) {
    console.error("Unexpected error in getSectionReportCardsList:", error);
    return [];
  }
}

/**
 * Get a single report card by ID
 *
 * @param reportCardId - The report card's ID
 * @returns The report card or null
 */
export async function getReportCard(
  reportCardId: string
): Promise<ReportCard | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .schema(SCHEMA)
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
        generated_by,
        approved_at,
        approved_by,
        released_at,
        released_by,
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
        ),
        student:students(
          id,
          lrn,
          profile:profiles(
            full_name,
            avatar_url
          )
        )
      `
      )
      .eq("id", reportCardId)
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
 * Get section report card summary
 *
 * @param sectionId - The section ID
 * @param gradingPeriodId - The grading period ID
 * @returns Summary statistics
 */
export async function getSectionReportCardSummary(
  sectionId: string,
  gradingPeriodId: string
): Promise<SectionReportCardSummary | null> {
  try {
    const supabase = await createClient();

    // Get section info
    const { data: section } = await supabase
      .schema(SCHEMA)
      .from("sections")
      .select("id, name")
      .eq("id", sectionId)
      .maybeSingle();

    if (!section) {
      return null;
    }

    // Get students in section
    const { data: students, count: studentCount } = await supabase
      .schema(SCHEMA)
      .from("students")
      .select("id", { count: "exact" })
      .eq("section_id", sectionId);

    // Get report cards for this section and period
    const { data: reportCards } = await supabase
      .schema(SCHEMA)
      .from("report_cards")
      .select("status, gpa_snapshot_json, attendance_summary_json")
      .in(
        "student_id",
        (students || []).map((s) => s.id)
      )
      .eq("grading_period_id", gradingPeriodId);

    // Calculate counts and averages
    let draftCount = 0;
    let pendingReviewCount = 0;
    let approvedCount = 0;
    let releasedCount = 0;
    let totalGPA = 0;
    let totalAttendance = 0;
    let countWithGPA = 0;
    let countWithAttendance = 0;

    (reportCards || []).forEach((rc) => {
      switch (rc.status) {
        case "draft":
          draftCount++;
          break;
        case "pending_review":
          pendingReviewCount++;
          break;
        case "approved":
          approvedCount++;
          break;
        case "released":
          releasedCount++;
          break;
      }

      const gpa = rc.gpa_snapshot_json as ReportCardGPA;
      const attendance = rc.attendance_summary_json as ReportCardAttendance;

      if (gpa?.term_gpa) {
        totalGPA += gpa.term_gpa;
        countWithGPA++;
      }
      if (attendance?.attendance_rate) {
        totalAttendance += attendance.attendance_rate;
        countWithAttendance++;
      }
    });

    return {
      section_id: sectionId,
      section_name: section.name,
      grading_period_id: gradingPeriodId,
      total_students: studentCount || 0,
      draft_count: draftCount,
      pending_review_count: pendingReviewCount,
      approved_count: approvedCount,
      released_count: releasedCount,
      average_gpa: countWithGPA > 0 ? totalGPA / countWithGPA : undefined,
      average_attendance_rate:
        countWithAttendance > 0
          ? totalAttendance / countWithAttendance
          : undefined,
    };
  } catch (error) {
    console.error("Unexpected error in getSectionReportCardSummary:", error);
    return null;
  }
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Add teacher remarks to a report card
 *
 * @param input - Remarks input data
 * @returns Updated report card or null on error
 */
export async function addTeacherRemarks(
  input: AddTeacherRemarksInput
): Promise<ReportCard | null> {
  try {
    const supabase = await createClient();

    // Get current report card
    const { data: current, error: fetchError } = await supabase
      .schema(SCHEMA)
      .from("report_cards")
      .select("teacher_remarks_json")
      .eq("id", input.report_card_id)
      .maybeSingle();

    if (fetchError || !current) {
      console.error("Error fetching report card for remarks:", fetchError);
      return null;
    }

    // Add new remark
    const existingRemarks = (current.teacher_remarks_json as TeacherRemark[]) || [];
    const newRemark: TeacherRemark = {
      teacher_id: input.teacher_id,
      teacher_name: input.teacher_name,
      subject: input.subject,
      subject_code: input.subject_code,
      remarks: input.remarks,
      created_at: new Date().toISOString(),
    };

    // Update with new remarks (replace if same teacher+subject exists)
    const filteredRemarks = existingRemarks.filter(
      (r) =>
        !(r.teacher_id === input.teacher_id && r.subject === input.subject)
    );
    const updatedRemarks = [...filteredRemarks, newRemark];

    // Save updated remarks
    const { error: updateError } = await supabase
      .schema(SCHEMA)
      .from("report_cards")
      .update({
        teacher_remarks_json: updatedRemarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.report_card_id);

    if (updateError) {
      console.error("Error adding teacher remarks:", updateError);
      return null;
    }

    // Return updated report card
    return getReportCard(input.report_card_id);
  } catch (error) {
    console.error("Unexpected error in addTeacherRemarks:", error);
    return null;
  }
}

/**
 * Submit report cards for review
 *
 * Changes status from 'draft' to 'pending_review'
 *
 * @param reportCardIds - Array of report card IDs
 * @returns Number of updated records
 */
export async function submitForReview(
  reportCardIds: string[]
): Promise<{ updated: number; errors: string[] }> {
  try {
    const supabase = await createClient();
    const errors: string[] = [];
    let updated = 0;

    for (const id of reportCardIds) {
      const { error } = await supabase
        .schema(SCHEMA)
        .from("report_cards")
        .update({
          status: "pending_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "draft"); // Only update drafts

      if (error) {
        errors.push(`Failed to submit ${id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("Unexpected error in submitForReview:", error);
    return { updated: 0, errors: ["Unexpected error occurred"] };
  }
}

/**
 * Get grading periods for a school
 *
 * @param schoolId - The school ID
 * @returns Array of grading periods
 */
export async function getGradingPeriods(
  schoolId: string
): Promise<{ id: string; name: string; academic_year: string; is_current: boolean }[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .schema(SCHEMA)
      .from("grading_periods")
      .select("id, name, academic_year, is_current")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching grading periods:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in getGradingPeriods:", error);
    return [];
  }
}

/**
 * Count report cards by status for teacher's sections
 *
 * @param teacherId - The teacher profile ID
 * @param gradingPeriodId - Optional grading period filter
 * @returns Status counts
 */
export async function countReportCardsByStatus(
  teacherId: string,
  gradingPeriodId?: string
): Promise<{
  draft: number;
  pending_review: number;
  approved: number;
  released: number;
  total: number;
}> {
  try {
    const supabase = await createClient();

    // Get teacher's sections
    const { data: teacherSections } = await supabase
      .schema(SCHEMA)
      .from("teacher_course_assignments")
      .select("section_id")
      .eq("teacher_id", teacherId)
      .eq("is_active", true);

    if (!teacherSections?.length) {
      return { draft: 0, pending_review: 0, approved: 0, released: 0, total: 0 };
    }

    const sectionIds = Array.from(new Set(teacherSections.map((s) => s.section_id)));

    // Get students in sections
    const { data: students } = await supabase
      .schema(SCHEMA)
      .from("students")
      .select("id")
      .in("section_id", sectionIds);

    if (!students?.length) {
      return { draft: 0, pending_review: 0, approved: 0, released: 0, total: 0 };
    }

    let query = supabase
      .schema(SCHEMA)
      .from("report_cards")
      .select("status")
      .in(
        "student_id",
        students.map((s) => s.id)
      );

    if (gradingPeriodId) {
      query = query.eq("grading_period_id", gradingPeriodId);
    }

    const { data: reportCards } = await query;

    const counts = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      released: 0,
      total: 0,
    };

    (reportCards || []).forEach((rc) => {
      counts.total++;
      switch (rc.status) {
        case "draft":
          counts.draft++;
          break;
        case "pending_review":
          counts.pending_review++;
          break;
        case "approved":
          counts.approved++;
          break;
        case "released":
          counts.released++;
          break;
      }
    });

    return counts;
  } catch (error) {
    console.error("Unexpected error in countReportCardsByStatus:", error);
    return { draft: 0, pending_review: 0, approved: 0, released: 0, total: 0 };
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

  const student = data.student as {
    id?: string;
    lrn?: string;
    profile?: {
      full_name?: string;
      avatar_url?: string;
    };
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
    generated_by: data.generated_by as string | undefined,
    approved_at: data.approved_at as string | undefined,
    approved_by: data.approved_by as string | undefined,
    released_at: data.released_at as string | undefined,
    released_by: data.released_by as string | undefined,
    pdf_url: data.pdf_url as string | undefined,
    pdf_generated_at: data.pdf_generated_at as string | undefined,
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
    student: student
      ? {
          id: student.id || "",
          lrn: student.lrn || "",
          profile: student.profile as { full_name: string; avatar_url?: string } | undefined,
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
  ReportCardFilters,
  ReportCardListItem,
  SectionReportCardSummary,
  AddTeacherRemarksInput,
} from "@/lib/types/report-card";
