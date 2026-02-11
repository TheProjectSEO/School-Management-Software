/**
 * Data Access Layer (DAL) for MSU Student Portal
 * Provides type-safe database queries using Supabase
 */

export * from "./types";
export * from "./student";
export * from "./subjects";
export * from "./live-sessions";

// Export auth functions
export * from "./auth";

// Export notifications (excluding conflicting download functions)
export {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  addDownload,
  removeDownload,
} from "./notifications";

// Export downloads (preferred over notifications version)
export * from "./downloads";

// Export quiz functions
export * from "./quiz";

// Export teacher announcement functions
export {
  getTeacherAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  getTargetableSections,
  getTargetableGradeLevels,
  getTargetableCourses,
  getTargetPreviewCount,
} from "./announcements";
export type {
  AnnouncementTargetType,
  AnnouncementPriority,
  Announcement as TeacherAnnouncement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./announcements";

// Export student announcement functions
export {
  getStudentAnnouncements,
  getAnnouncementDetail,
  markAnnouncementAsRead,
  getUnreadAnnouncementCount,
  getUrgentAnnouncements,
} from "./student-announcements";

// Export teacher messaging functions
export {
  getTeacherConversations,
  getConversationMessages,
  sendMessageToStudent,
  markMessagesAsRead,
  getUnreadMessageCount,
  getStudentsForMessaging,
  getStudentIdByProfileId,
} from "./messages";
export type {
  DirectMessage as TeacherDirectMessage,
  Conversation as TeacherConversation,
  StudentForMessaging,
  SendMessageResult as TeacherSendMessageResult,
} from "./messages";

// Export student messaging functions
export {
  getStudentConversations,
  getStudentConversationMessages,
  getMessageQuota,
  sendMessageToTeacher,
  markStudentMessagesAsRead,
  getStudentUnreadMessageCount,
  getAvailableTeachers,
  getTeacherIdByProfileId,
  getAvailablePeers,
} from "./student-messages";
export type { PeerStudent } from "./student-messages";

// Export teacher assessment functions
export {
  getTeacherAssessments,
  getPendingSubmissions,
  getSubmissionDetail,
} from "./assessments";
export type {
  Assessment as TeacherAssessment,
  Submission as TeacherSubmission,
  SubmissionDetail,
} from "./assessments";

// Export student assessment functions
export {
  getUpcomingAssessments,
  getCourseAssessments,
  getSubjectAssessments,
  getAssessmentById,
  getAssessmentSubmission,
  submitAssessment,
  getGradedAssessments,
  getAssessmentStats,
} from "./student-assessments";

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

// Export admin functions
export {
  requireAdminAPI,
  hasPermission,
  getCurrentAdmin,
} from "./admin";
export type {
  AdminRole,
  AdminPermission,
  AdminContext,
} from "./admin";

// Export enrollment management functions
export {
  getEnrollmentById,
  approveEnrollment,
  dropEnrollment,
  transferEnrollment,
  getEnrollments,
} from "./enrollments";
export type {
  EnrollmentStatus,
  EnrollmentDetails,
  EnrollmentActionResult,
} from "./enrollments";

// Export reports functions
export {
  getAttendanceReport,
  getGradesReport,
  getProgressReport,
  getDashboardStats,
  getEnrollmentStatsBySection,
} from "./reports";
export type {
  AttendanceReportFilters,
  AttendanceReportItem,
  GradesReportFilters,
  GradesReportItem,
  ProgressReportFilters,
  ProgressReportItem,
  DashboardStats,
} from "./reports";

// Export settings functions
export {
  getAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  getGradingPeriods,
  getGradingPeriodById,
  updateGradingPeriod,
  createGradingPeriod,
  getSchoolSettings,
  updateSchoolSettings,
  getSchool,
} from "./settings";
export type {
  AcademicYear,
  CreateAcademicYearInput,
  GradingPeriod,
  UpdateGradingPeriodInput,
  SchoolSettings,
  UpdateSchoolSettingsInput,
} from "./settings";

// Export user management functions
export {
  getStudents,
  getStudentById as getStudentDetailsById,
  updateStudent,
  getTeachers,
  getTeacherById as getTeacherDetailsById,
  updateTeacher,
  getSections,
  getDepartments,
} from "./users";
export type {
  StudentListFilters,
  StudentListItem,
  StudentDetails,
  UpdateStudentInput,
  TeacherListFilters,
  TeacherListItem,
  TeacherDetails,
  UpdateTeacherInput,
} from "./users";
