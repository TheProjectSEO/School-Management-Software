/**
 * Data Access Layer (DAL) for MSU Student Portal
 * Provides type-safe database queries using Supabase
 */

export * from "./types";
export * from "./student";
export * from "./subjects";
export * from "./assessments";
export * from "./live-sessions";

// Export notifications (excluding conflicting download functions)
export {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotes,
} from "./notifications";

// Export downloads (preferred over notifications version)
export * from "./downloads";

// Export quiz functions
export * from "./quiz";

// Export announcement functions
export * from "./announcements";

// Export messaging functions
export * from "./messages";

// Export grades functions
export {
  getStudentCourseGrades,
  getCourseGradeHistory,
  getCurrentGPA,
  getGPAHistory,
  getGPATrend,
  getStudentReportCards,
  getGradeSummary,
  getStudentGradingPeriods,
} from "./grades";

// Export grades types (excluding ReportCard to avoid conflict with report-cards)
export type {
  CourseGradeStatus,
  AcademicStanding,
  ReportCardStatus,
  CourseGrade,
  SemesterGPA,
  CourseGradeWithDetails,
  GradeSummary,
  GPATrendPoint,
} from "./types/grades";

// Export attendance functions and types
export * from "./attendance";
export * from "./types/attendance";

// Export report card functions (student-facing, released only)
// This includes the primary getReportCard function and ReportCard type
export * from "./report-cards";
