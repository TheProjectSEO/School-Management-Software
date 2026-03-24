/**
 * Report Card Generator
 *
 * Compiles student academic data (grades, GPA, attendance) and creates
 * a snapshot for historical accuracy. Report cards should not change
 * once generated - they represent a point-in-time record.
 */

import { createServiceClient } from '@/lib/supabase/service';
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
    const supabase = createServiceClient();

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
          status: "pending_review",
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
        status: "pending_review",
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
    const supabase = createServiceClient()
    const { data: student } = await supabase
      .from('students')
      .select('id, lrn, student_number, section_id, profile_id')
      .eq('id', studentId)
      .single()

    if (!student) return null

    let fullName = 'Unknown Student', email: string | undefined, dateOfBirth: string | undefined
    if (student.profile_id) {
      const { data: profile } = await supabase
        .from('school_profiles')
        .select('full_name, email, date_of_birth')
        .eq('id', (student as any).profile_id)
        .single()
      if (profile) {
        fullName = (profile as any).full_name || 'Unknown Student'
        email = (profile as any).email
        dateOfBirth = (profile as any).date_of_birth
      }
    }

    let gradeName = '', sectionName = ''
    if (student.section_id) {
      const { data: section } = await supabase
        .from('sections')
        .select('name, grade_level')
        .eq('id', student.section_id)
        .single()
      if (section) {
        gradeName = (section as any).grade_level || ''
        sectionName = (section as any).name || ''
      }
    }

    return {
      full_name: fullName,
      lrn: student.lrn || '',
      grade_level: gradeName,
      section_name: sectionName,
      student_number: (student as any).student_number,
      email,
      date_of_birth: dateOfBirth,
    }
  } catch (error) {
    console.error('Unexpected error in fetchStudentInfo:', error)
    return null
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
    const supabase = createServiceClient()

    const { data: gradeRows, error } = await supabase
      .from('course_grades')
      .select('id, course_id, quarterly_grade, numeric_grade, letter_grade, gpa_points, credit_hours')
      .eq('student_id', studentId)
      .eq('grading_period_id', gradingPeriodId)
      .eq('is_released', true)

    if (error) {
      console.error('Error fetching student grades:', error)
      return []
    }

    if (!gradeRows || gradeRows.length === 0) return []

    // Fetch courses separately (BUG-001: no FK joins)
    const courseIds = [...new Set(gradeRows.map((g: any) => g.course_id).filter(Boolean))]
    const courseMap = new Map<string, { id: string; name: string; subject_code: string }>()
    if (courseIds.length > 0) {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name, subject_code')
        .in('id', courseIds)
      courses?.forEach((c: any) => courseMap.set(c.id, c))
    }

    return gradeRows.map((grade: any) => {
      const course = courseMap.get(grade.course_id)
      const numericGrade = grade.quarterly_grade ?? grade.numeric_grade ?? 0
      const letterGrade = grade.letter_grade || depedLetterGrade(numericGrade)
      return {
        course_id: grade.course_id,
        course_name: course?.name || 'Unknown Course',
        subject_code: course?.subject_code || '',
        credit_hours: grade.credit_hours || 1,
        numeric_grade: numericGrade,
        letter_grade: letterGrade,
        gpa_points: grade.gpa_points || 0,
        teacher_name: '',
      } as ReportCardGrade
    })
  } catch (error) {
    console.error('Unexpected error in fetchStudentGrades:', error)
    return []
  }
}

/**
 * DepEd letter grade from numeric average
 */
function depedLetterGrade(grade: number): string {
  if (grade >= 90) return 'O'
  if (grade >= 85) return 'VS'
  if (grade >= 80) return 'S'
  if (grade >= 75) return 'FS'
  return 'DNME'
}

/**
 * Fetch teacher name by ID
 */
async function fetchTeacherName(teacherId: string): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data: tp } = await supabase
      .from('teacher_profiles')
      .select('profile_id')
      .eq('id', teacherId)
      .single()
    if (!tp?.profile_id) return 'Unknown Teacher'
    const { data: profile } = await supabase
      .from('school_profiles')
      .select('full_name')
      .eq('id', (tp as any).profile_id)
      .single()
    return (profile as any)?.full_name || 'Unknown Teacher'
  } catch {
    return 'Unknown Teacher'
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
    const supabase = createServiceClient()
    const { data: grades } = await supabase
      .from('course_grades')
      .select('quarterly_grade, numeric_grade')
      .eq('student_id', studentId)
      .eq('grading_period_id', gradingPeriodId)
      .eq('is_released', true)

    const gradeValues = (grades || [])
      .map((g: any) => g.quarterly_grade ?? g.numeric_grade ?? 0)
      .filter((v: number) => v > 0)

    const termGPA = gradeValues.length > 0
      ? Math.round((gradeValues.reduce((a: number, b: number) => a + b, 0) / gradeValues.length) * 100) / 100
      : 0

    return {
      term_gpa: termGPA,
      cumulative_gpa: termGPA,
      term_credits: gradeValues.length,
      cumulative_credits: gradeValues.length,
      academic_standing: depedAcademicStanding(termGPA),
    }
  } catch (error) {
    console.error('Unexpected error in fetchStudentGPA:', error)
    return { term_gpa: 0, cumulative_gpa: 0, term_credits: 0, cumulative_credits: 0, academic_standing: 'good_standing' }
  }
}

/**
 * Determine DepEd academic standing based on average grade
 */
function depedAcademicStanding(avg: number): AcademicStanding {
  if (avg >= 98) return 'presidents_list'
  if (avg >= 95) return 'deans_list'
  if (avg >= 75) return 'good_standing'
  return 'probation'
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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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

export { determineAcademicStanding };
