/**
 * Report Card Generator
 *
 * Compiles student academic data (grades, GPA, attendance) and creates
 * a snapshot for historical accuracy. Report cards should not change
 * once generated - they represent a point-in-time record.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ReportCard,
  ReportCardGrade,
  ReportCardGPA,
  ReportCardAttendance,
  ReportCardStudentInfo,
  CompiledReportCardData,
  AcademicStanding,
} from "@/lib/types/report-card";

// Schema name
// Note: All tables are in the public schema (default), not a separate schema
// Removed SCHEMA constant - using default public schema

// ============================================================================
// MAIN COMPILATION FUNCTION
// ============================================================================

/**
 * Compile all report card data for a student in a grading period
 *
 * This fetches and aggregates:
 * - Student profile information
 * - Course grades for the period
 * - GPA calculations
 * - Attendance summary
 *
 * @param studentId - The student's ID
 * @param gradingPeriodId - The grading period's ID
 * @returns Compiled data ready for snapshotting
 */
export async function compileReportCardData(
  studentId: string,
  gradingPeriodId: string
): Promise<CompiledReportCardData | null> {
  try {
    const [studentInfo, grades, gpa, attendance] = await Promise.all([
      fetchStudentInfo(studentId),
      fetchStudentGrades(studentId, gradingPeriodId),
      fetchStudentGPA(studentId, gradingPeriodId),
      fetchStudentAttendance(studentId, gradingPeriodId),
    ]);

    if (!studentInfo) {
      console.error("Student not found:", studentId);
      return null;
    }

    return {
      student_info: studentInfo,
      grades: grades,
      gpa: gpa,
      attendance: attendance,
    };
  } catch (error) {
    console.error("Error compiling report card data:", error);
    return null;
  }
}

// ============================================================================
// SNAPSHOT CREATION
// ============================================================================

/**
 * Create a report card snapshot in the database
 *
 * This persists the compiled data as a JSON snapshot for historical accuracy.
 * The report card starts in 'draft' status.
 *
 * @param studentId - The student's ID
 * @param gradingPeriodId - The grading period's ID
 * @param schoolId - The school's ID
 * @param data - Compiled report card data
 * @param generatedBy - ID of the user generating the report card
 * @returns The created report card ID, or null on failure
 */
export async function createReportCardSnapshot(
  studentId: string,
  gradingPeriodId: string,
  schoolId: string,
  data: CompiledReportCardData,
  generatedBy: string
): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Check if report card already exists for this student/period
    const { data: existing } = await supabase
      .from("report_cards")
      .select("id")
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId)
      .maybeSingle();

    if (existing) {
      // Update existing report card
      const { data: updated, error } = await supabase
          .from("report_cards")
        .update({
          student_info_json: data.student_info,
          grades_snapshot_json: data.grades,
          gpa_snapshot_json: data.gpa,
          attendance_summary_json: data.attendance,
          generated_at: new Date().toISOString(),
          generated_by: generatedBy,
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        console.error("Error updating report card:", error);
        return null;
      }

      return updated.id;
    }

    // Create new report card
    const { data: created, error } = await supabase
      .from("report_cards")
      .insert({
        student_id: studentId,
        grading_period_id: gradingPeriodId,
        school_id: schoolId,
        student_info_json: data.student_info,
        grades_snapshot_json: data.grades,
        gpa_snapshot_json: data.gpa,
        attendance_summary_json: data.attendance,
        status: "draft",
        generated_at: new Date().toISOString(),
        generated_by: generatedBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating report card:", error);
      return null;
    }

    return created.id;
  } catch (error) {
    console.error("Unexpected error in createReportCardSnapshot:", error);
    return null;
  }
}

// ============================================================================
// DATA FETCHING HELPERS
// ============================================================================

/**
 * Fetch student profile information
 */
async function fetchStudentInfo(
  studentId: string
): Promise<ReportCardStudentInfo | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        lrn,
        student_number,
        section_id,
        profile:school_profiles!inner(
          full_name,
          email,
          date_of_birth
        ),
        section:sections(
          name,
          grade_level
        )
      `
      )
      .eq("id", studentId)
      .single();

    if (error || !data) {
      console.error("Error fetching student info:", error);
      return null;
    }

    const profile = data.profile as { full_name?: string; email?: string; date_of_birth?: string };
    const section = data.section as { name?: string; grade_level?: string };

    return {
      full_name: profile?.full_name || "Unknown Student",
      lrn: data.lrn || "",
      grade_level: section?.grade_level || "",
      section_name: section?.name || "",
      student_number: data.student_number,
      email: profile?.email,
      date_of_birth: profile?.date_of_birth,
    };
  } catch (error) {
    console.error("Unexpected error in fetchStudentInfo:", error);
    return null;
  }
}

/**
 * Fetch student course grades for a grading period
 */
async function fetchStudentGrades(
  studentId: string,
  gradingPeriodId: string
): Promise<ReportCardGrade[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("course_grades")
      .select(
        `
        id,
        course_id,
        numeric_grade,
        letter_grade,
        gpa_points,
        credit_hours,
        course:courses(
          id,
          name,
          subject_code,
          teacher_id
        )
      `
      )
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId);

    if (error) {
      console.error("Error fetching student grades:", error);
      return [];
    }

    // Fetch teacher names for each course
    const gradesWithTeachers = await Promise.all(
      (data || []).map(async (grade) => {
        const course = grade.course as {
          id?: string;
          name?: string;
          subject_code?: string;
          teacher_id?: string;
        };

        let teacherName = "Unknown Teacher";
        if (course?.teacher_id) {
          teacherName = await fetchTeacherName(course.teacher_id);
        }

        return {
          course_id: grade.course_id,
          course_name: course?.name || "Unknown Course",
          subject_code: course?.subject_code || "",
          credit_hours: grade.credit_hours || 3,
          numeric_grade: grade.numeric_grade || 0,
          letter_grade: grade.letter_grade || "NG",
          gpa_points: grade.gpa_points || 0,
          teacher_name: teacherName,
        } as ReportCardGrade;
      })
    );

    return gradesWithTeachers;
  } catch (error) {
    console.error("Unexpected error in fetchStudentGrades:", error);
    return [];
  }
}

/**
 * Fetch teacher name by ID
 */
async function fetchTeacherName(teacherId: string): Promise<string> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("teacher_profiles")
      .select(
        `
        profile:school_profiles!inner(
          full_name
        )
      `
      )
      .eq("id", teacherId)
      .single();

    if (error || !data) {
      return "Unknown Teacher";
    }

    const profile = data.profile as { full_name?: string };
    return profile?.full_name || "Unknown Teacher";
  } catch {
    return "Unknown Teacher";
  }
}

/**
 * Fetch or calculate student GPA for a grading period
 */
async function fetchStudentGPA(
  studentId: string,
  gradingPeriodId: string
): Promise<ReportCardGPA> {
  try {
    const supabase = await createClient();

    // Try to get existing GPA record
    const { data: gpaRecord, error } = await supabase
      .from("semester_gpa")
      .select("*")
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId)
      .maybeSingle();

    if (gpaRecord && !error) {
      return {
        term_gpa: gpaRecord.term_gpa || 0,
        cumulative_gpa: gpaRecord.cumulative_gpa || 0,
        term_credits: gpaRecord.term_credits_earned || 0,
        cumulative_credits: gpaRecord.cumulative_credits_earned || 0,
        academic_standing: (gpaRecord.academic_standing as AcademicStanding) || "good_standing",
      };
    }

    // Calculate GPA from grades if no record exists
    return calculateGPAFromGrades(studentId, gradingPeriodId);
  } catch (error) {
    console.error("Unexpected error in fetchStudentGPA:", error);
    return {
      term_gpa: 0,
      cumulative_gpa: 0,
      term_credits: 0,
      cumulative_credits: 0,
      academic_standing: "good_standing",
    };
  }
}

/**
 * Calculate GPA from course grades
 */
async function calculateGPAFromGrades(
  studentId: string,
  gradingPeriodId: string
): Promise<ReportCardGPA> {
  try {
    const supabase = await createClient();

    // Get current term grades
    const { data: termGrades } = await supabase
      .from("course_grades")
      .select("gpa_points, credit_hours")
      .eq("student_id", studentId)
      .eq("grading_period_id", gradingPeriodId);

    // Get all grades for cumulative GPA
    const { data: allGrades } = await supabase
      .from("course_grades")
      .select("gpa_points, credit_hours")
      .eq("student_id", studentId);

    const termGPA = calculateWeightedGPA(termGrades || []);
    const cumulativeGPA = calculateWeightedGPA(allGrades || []);

    const termCredits = (termGrades || []).reduce(
      (sum, g) => sum + (g.credit_hours || 0),
      0
    );
    const cumulativeCredits = (allGrades || []).reduce(
      (sum, g) => sum + (g.credit_hours || 0),
      0
    );

    return {
      term_gpa: termGPA,
      cumulative_gpa: cumulativeGPA,
      term_credits: termCredits,
      cumulative_credits: cumulativeCredits,
      academic_standing: determineAcademicStanding(cumulativeGPA),
    };
  } catch {
    return {
      term_gpa: 0,
      cumulative_gpa: 0,
      term_credits: 0,
      cumulative_credits: 0,
      academic_standing: "good_standing",
    };
  }
}

/**
 * Calculate weighted GPA from grades
 */
function calculateWeightedGPA(
  grades: { gpa_points?: number; credit_hours?: number }[]
): number {
  if (grades.length === 0) return 0;

  let totalQualityPoints = 0;
  let totalCredits = 0;

  for (const grade of grades) {
    const gpaPoints = grade.gpa_points || 0;
    const credits = grade.credit_hours || 0;
    totalQualityPoints += gpaPoints * credits;
    totalCredits += credits;
  }

  if (totalCredits === 0) return 0;
  return Math.round((totalQualityPoints / totalCredits) * 100) / 100;
}

/**
 * Determine academic standing based on GPA
 */
function determineAcademicStanding(gpa: number): AcademicStanding {
  if (gpa >= 3.8) return "presidents_list";
  if (gpa >= 3.5) return "deans_list";
  if (gpa >= 2.0) return "good_standing";
  if (gpa >= 1.5) return "probation";
  return "suspension";
}

/**
 * Fetch student attendance summary for a grading period
 */
async function fetchStudentAttendance(
  studentId: string,
  gradingPeriodId: string
): Promise<ReportCardAttendance> {
  try {
    const supabase = await createClient();

    // Get grading period dates
    const { data: period } = await supabase
      .from("grading_periods")
      .select("start_date, end_date")
      .eq("id", gradingPeriodId)
      .single();

    if (!period?.start_date || !period?.end_date) {
      return createEmptyAttendance();
    }

    // Get attendance records within the period
    const { data: attendanceRecords, error } = await supabase
      .from("teacher_attendance")
      .select("attendance_date, status")
      .eq("student_id", studentId)
      .gte("attendance_date", period.start_date)
      .lte("attendance_date", period.end_date);

    if (error) {
      console.error("Error fetching attendance:", error);
      return createEmptyAttendance();
    }

    // Aggregate by date (take worst status if multiple per day)
    const dailyStatuses = new Map<string, string>();
    for (const record of attendanceRecords || []) {
      const existing = dailyStatuses.get(record.attendance_date);
      const current = record.status;

      if (
        !existing ||
        getStatusPriority(current) > getStatusPriority(existing)
      ) {
        dailyStatuses.set(record.attendance_date, current);
      }
    }

    // Count statuses
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let excusedDays = 0;

    for (const status of dailyStatuses.values()) {
      switch (status) {
        case "present":
          presentDays++;
          break;
        case "late":
          lateDays++;
          break;
        case "absent":
          absentDays++;
          break;
        case "excused":
          excusedDays++;
          break;
      }
    }

    const totalDays = dailyStatuses.size;
    const attendanceRate =
      totalDays > 0
        ? Math.round(((presentDays + lateDays) / totalDays) * 10000) / 100
        : 0;

    return {
      total_days: totalDays,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      excused_days: excusedDays,
      attendance_rate: attendanceRate,
    };
  } catch (error) {
    console.error("Unexpected error in fetchStudentAttendance:", error);
    return createEmptyAttendance();
  }
}

/**
 * Get status priority (higher = worse)
 */
function getStatusPriority(status: string): number {
  switch (status) {
    case "present":
      return 0;
    case "excused":
      return 1;
    case "late":
      return 2;
    case "absent":
      return 3;
    default:
      return 0;
  }
}

/**
 * Create empty attendance summary
 */
function createEmptyAttendance(): ReportCardAttendance {
  return {
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    excused_days: 0,
    attendance_rate: 0,
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate report cards for all students in a section
 *
 * @param sectionId - The section's ID
 * @param gradingPeriodId - The grading period's ID
 * @param schoolId - The school's ID
 * @param generatedBy - ID of the user generating report cards
 * @returns Results with counts and any errors
 */
export async function batchGenerateReportCards(
  sectionId: string,
  gradingPeriodId: string,
  schoolId: string,
  generatedBy: string
): Promise<{
  generated: number;
  failed: number;
  errors: string[];
  report_card_ids: string[];
}> {
  const results = {
    generated: 0,
    failed: 0,
    errors: [] as string[],
    report_card_ids: [] as string[],
  };

  try {
    const supabase = await createClient();

    // Get all students in the section
    const { data: students, error } = await supabase
      .from("students")
      .select("id")
      .eq("section_id", sectionId);

    if (error || !students) {
      results.errors.push("Failed to fetch students for section");
      return results;
    }

    // Generate report card for each student
    for (const student of students) {
      try {
        const data = await compileReportCardData(
          student.id,
          gradingPeriodId
        );

        if (!data) {
          results.failed++;
          results.errors.push(`Failed to compile data for student ${student.id}`);
          continue;
        }

        const reportCardId = await createReportCardSnapshot(
          student.id,
          gradingPeriodId,
          schoolId,
          data,
          generatedBy
        );

        if (reportCardId) {
          results.generated++;
          results.report_card_ids.push(reportCardId);
        } else {
          results.failed++;
          results.errors.push(`Failed to create snapshot for student ${student.id}`);
        }
      } catch (err) {
        results.failed++;
        results.errors.push(
          `Error processing student ${student.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return results;
  } catch (error) {
    results.errors.push(
      `Batch generation error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return results;
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { determineAcademicStanding, calculateWeightedGPA };
