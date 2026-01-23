/**
 * Types for Student Grades Data Access Layer
 *
 * These types represent the student-facing grades data, including
 * course grades, GPA records, and report cards.
 */

// ============================================================================
// ENUMS / STATUS TYPES
// ============================================================================

/**
 * Status of a course grade through its lifecycle
 */
export type CourseGradeStatus =
  | "in_progress" // Grade calculation ongoing
  | "calculated" // Grade computed but not released
  | "released" // Grade visible to student
  | "finalized"; // Grade locked, no changes possible

/**
 * Academic standing based on GPA thresholds
 */
export type AcademicStanding =
  | "good_standing" // Meets minimum requirements
  | "deans_list" // High academic achievement
  | "presidents_list" // Highest academic achievement
  | "probation" // Below minimum GPA threshold
  | "suspension"; // Academic dismissal

/**
 * Status of a report card through its lifecycle
 */
export type ReportCardStatus =
  | "draft" // Initial creation
  | "pending_review" // Awaiting approval
  | "approved" // Approved by admin
  | "released"; // Visible to student

// ============================================================================
// CORE GRADE INTERFACES
// ============================================================================

/**
 * A single course grade for a student in a grading period
 *
 * Referenced table: "public".course_grades
 */
export interface CourseGrade {
  id: string;
  student_id: string;
  course_id: string;
  grading_period_id: string;

  // Grade values
  numeric_grade?: number; // e.g., 85.5
  letter_grade?: string; // e.g., "A", "B+", "INC"
  gpa_points?: number; // e.g., 4.0, 3.5
  credit_hours: number; // Course credit weight
  quality_points?: number; // credit_hours * gpa_points

  // Status and visibility
  status: CourseGradeStatus;
  is_released: boolean; // RLS uses this for student access
  released_at?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Joined relations
  course?: {
    id: string;
    name: string;
    subject_code?: string;
  };
  grading_period?: {
    id: string;
    name: string;
    academic_year: string;
  };
}

/**
 * Semester/term GPA summary for a student
 *
 * Referenced table: "public".semester_gpa
 */
export interface SemesterGPA {
  id: string;
  student_id: string;
  grading_period_id: string;

  // Term (current semester) metrics
  term_gpa?: number;
  term_credits_attempted?: number;
  term_credits_earned?: number;

  // Cumulative (all semesters) metrics
  cumulative_gpa?: number;
  cumulative_credits_attempted?: number;
  cumulative_credits_earned?: number;

  // Standing
  academic_standing?: AcademicStanding;

  // Timestamps
  calculated_at?: string;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  grading_period?: {
    id: string;
    name: string;
    academic_year: string;
  };
}

/**
 * Report card containing a snapshot of grades and GPA for a grading period
 *
 * Referenced table: "public".report_cards
 */
export interface ReportCard {
  id: string;
  student_id: string;
  grading_period_id: string;

  // Snapshot data (stored as JSON for historical accuracy)
  grades_snapshot_json: object;
  gpa_snapshot_json: object;
  student_info_json: object;
  teacher_remarks_json?: object;
  attendance_summary_json?: object;

  // Status and visibility
  status: ReportCardStatus;
  pdf_url?: string;

  // Timestamps
  generated_at: string;
  released_at?: string;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  grading_period?: {
    id: string;
    name: string;
    academic_year: string;
  };
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

/**
 * Course grade with full details for display
 */
export interface CourseGradeWithDetails extends CourseGrade {
  course_name: string;
  course_code?: string;
  period_name: string;
  academic_year: string;
}

/**
 * Summary of grades for a grading period
 */
export interface GradeSummary {
  grading_period_id: string;
  period_name: string;
  academic_year: string;
  total_courses: number;
  courses_graded: number;
  term_gpa?: number;
  cumulative_gpa?: number;
  academic_standing?: AcademicStanding;
}

/**
 * GPA trend data point for visualization
 */
export interface GPATrendPoint {
  grading_period_id: string;
  period_name: string;
  academic_year: string;
  term_gpa?: number;
  cumulative_gpa?: number;
  term_credits_earned?: number;
}
