/**
 * Report Card Types for Teacher App
 *
 * Types for the report card generation and management system.
 * Teachers can generate, review, and manage report cards before release.
 *
 * Report cards flow: draft -> pending_review -> approved -> released
 * Teachers manage drafts and can submit for review.
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
  lrn: string;
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
  | "draft"
  | "pending_review"
  | "approved"
  | "released";

// ============================================================================
// MAIN REPORT CARD INTERFACE
// ============================================================================

/**
 * Complete report card for teacher view
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

  // Joined relations
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
  student?: {
    id: string;
    lrn: string;
    profile?: {
      full_name: string;
      avatar_url?: string;
    };
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
 * Input for submitting for review
 */
export interface SubmitForReviewInput {
  report_card_ids: string[];
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

/**
 * Report card with student avatar for list display
 */
export interface ReportCardListItem {
  id: string;
  student_id: string;
  student_name: string;
  student_lrn: string;
  student_avatar?: string;
  section_name: string;
  grade_level: string;
  term_gpa: number;
  attendance_rate: number;
  status: ReportCardStatus;
  generated_at: string;
  has_remarks: boolean;
  has_pdf: boolean;
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
