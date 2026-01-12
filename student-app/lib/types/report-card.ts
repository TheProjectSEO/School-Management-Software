/**
 * Report Card Types
 *
 * Types for the report card generation system. Report cards are snapshots
 * of student academic data (grades, GPA, attendance) at a specific point in time.
 *
 * Report cards flow: draft -> pending_review -> approved -> released
 * Only 'released' report cards are visible to students.
 */

// ============================================================================
// GRADE TYPES
// ============================================================================

/**
 * Individual course grade entry in a report card
 */
export interface ReportCardGrade {
  course_id: string;
  course_name: string;
  subject_code: string;
  credit_hours: number;
  numeric_grade: number;
  letter_grade: string;
  gpa_points: number;
  teacher_name: string;
  remarks?: string;
}

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

/**
 * Attendance summary for a report card period
 */
export interface ReportCardAttendance {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_rate: number; // Percentage (0-100)
}

// ============================================================================
// GPA TYPES
// ============================================================================

/**
 * GPA summary for a report card
 */
export interface ReportCardGPA {
  term_gpa: number;
  cumulative_gpa: number;
  term_credits: number;
  cumulative_credits: number;
  academic_standing: AcademicStanding;
}

/**
 * Academic standing based on GPA thresholds
 */
export type AcademicStanding =
  | "good_standing"
  | "deans_list"
  | "presidents_list"
  | "probation"
  | "suspension";

// ============================================================================
// STUDENT INFO TYPES
// ============================================================================

/**
 * Student information snapshot in a report card
 */
export interface ReportCardStudentInfo {
  full_name: string;
  lrn: string; // Learner Reference Number
  grade_level: string;
  section_name: string;
  student_number?: string;
  email?: string;
  date_of_birth?: string;
  guardian_name?: string;
}

// ============================================================================
// TEACHER REMARKS TYPES
// ============================================================================

/**
 * Teacher remarks entry for a specific subject
 */
export interface TeacherRemark {
  teacher_id: string;
  teacher_name: string;
  subject: string;
  subject_code?: string;
  remarks: string;
  created_at: string;
}

// ============================================================================
// REPORT CARD STATUS
// ============================================================================

/**
 * Status of a report card through its lifecycle
 */
export type ReportCardStatus =
  | "draft" // Initial creation, can be edited
  | "pending_review" // Submitted for review/approval
  | "approved" // Approved by admin/principal
  | "released"; // Visible to student/parent

// ============================================================================
// MAIN REPORT CARD INTERFACE
// ============================================================================

/**
 * Complete report card containing all student academic data for a grading period
 */
export interface ReportCard {
  id: string;
  student_id: string;
  grading_period_id: string;
  school_id: string;

  // Snapshot data
  student_info: ReportCardStudentInfo;
  grades: ReportCardGrade[];
  gpa: ReportCardGPA;
  attendance: ReportCardAttendance;
  teacher_remarks?: TeacherRemark[];

  // Status and tracking
  status: ReportCardStatus;
  generated_at: string;
  generated_by?: string;
  approved_at?: string;
  approved_by?: string;
  released_at?: string;
  released_by?: string;

  // PDF
  pdf_url?: string;
  pdf_generated_at?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;

  // Joined relations (optional, populated by queries)
  grading_period?: {
    id: string;
    name: string;
    academic_year: string;
    start_date?: string;
    end_date?: string;
  };
  school?: {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
  };
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Input for generating a report card
 */
export interface GenerateReportCardInput {
  student_id: string;
  grading_period_id: string;
  generated_by: string;
}

/**
 * Input for batch generating report cards
 */
export interface BatchGenerateReportCardsInput {
  section_id: string;
  grading_period_id: string;
  generated_by: string;
}

/**
 * Result of batch generation
 */
export interface BatchGenerationResult {
  generated: number;
  failed: number;
  errors: string[];
  report_card_ids: string[];
}

/**
 * Input for adding teacher remarks
 */
export interface AddTeacherRemarksInput {
  report_card_id: string;
  teacher_id: string;
  teacher_name: string;
  subject: string;
  subject_code?: string;
  remarks: string;
}

/**
 * Input for approving a report card
 */
export interface ApproveReportCardInput {
  report_card_id: string;
  approved_by: string;
}

/**
 * Input for releasing report cards
 */
export interface ReleaseReportCardsInput {
  report_card_ids: string[];
  released_by: string;
}

/**
 * Result of release operation
 */
export interface ReleaseResult {
  released: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// COMPILED DATA TYPES (for generation)
// ============================================================================

/**
 * Compiled report card data before snapshotting
 */
export interface CompiledReportCardData {
  student_info: ReportCardStudentInfo;
  grades: ReportCardGrade[];
  gpa: ReportCardGPA;
  attendance: ReportCardAttendance;
}

// ============================================================================
// SCHOOL INFO (for PDF)
// ============================================================================

/**
 * School information for PDF header
 */
export interface SchoolInfo {
  id: string;
  name: string;
  address?: string;
  city?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// ============================================================================
// GRADING PERIOD
// ============================================================================

/**
 * Grading period information
 */
export interface GradingPeriod {
  id: string;
  name: string;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Filters for querying report cards
 */
export interface ReportCardFilters {
  section_id?: string;
  grading_period_id?: string;
  status?: ReportCardStatus;
  student_id?: string;
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Summary statistics for a section's report cards
 */
export interface SectionReportCardSummary {
  section_id: string;
  section_name: string;
  grading_period_id: string;
  total_students: number;
  draft_count: number;
  pending_review_count: number;
  approved_count: number;
  released_count: number;
  average_gpa?: number;
  average_attendance_rate?: number;
}
