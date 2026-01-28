/**
 * Teacher Data Access Layer - Main Index
 *
 * Centralized exports for all teacher DAL functions.
 * All queries use n8n_content_creation schema with proper RLS policies.
 */

// Identity & Profile
export {
  getCurrentTeacher,
  getTeacherAssignments,
  getTeacherSchool,
  verifyTeacherSectionAccess,
  verifyTeacherSubjectAccess,
  type Teacher,
  type TeacherAssignment,
  type School
} from './identity';

// Content Management
export {
  getTeacherSubjects,
  createModule,
  publishModule,
  createTranscript,
  publishTranscript,
  getModuleTranscripts,
  uploadContentAsset,
  getContentAssetUrl,
  type Subject,
  type Module,
  type CreateModuleInput,
  type Transcript,
  type CreateTranscriptInput,
  type ContentAsset,
  type UploadContentAssetInput
} from './content';

// Assessments
export {
  getQuestionBanks,
  createQuestionBank,
  addQuestionToBank,
  createAssessment,
  addBankRules,
  generateQuizSnapshot,
  getBankQuestions,
  type QuestionBank,
  type CreateQuestionBankInput,
  type Question,
  type AddQuestionInput,
  type Assessment,
  type CreateAssessmentInput,
  type BankRule,
  type AddBankRuleInput,
  type QuizSnapshot
} from './assessments';

// Grading
export {
  getPendingSubmissions,
  getSubmission,
  gradeSubmission,
  applyRubricScore,
  releaseGrades,
  createFeedback,
  getRubricTemplates,
  getSubmissionRubricScore,
  type Submission,
  type SubmissionVersion,
  type RubricTemplate,
  type RubricCriterion,
  type RubricLevel,
  type RubricScore,
  type GradeSubmissionInput,
  type ApplyRubricScoreInput,
  type Feedback,
  type CreateFeedbackInput
} from './grading';

// Communication
export {
  sendAnnouncement,
  getDiscussionThreads,
  createDiscussionThread,
  getThreadPosts,
  addThreadPost,
  sendDirectMessage,
  getMessages,
  getConversation,
  markMessageAsRead,
  getUnreadMessageCount,
  type Announcement,
  type CreateAnnouncementInput,
  type DiscussionThread,
  type DiscussionPost,
  type DirectMessage,
  type SendDirectMessageInput,
  type Notification
} from './communication';

// Attendance
export {
  getSessionAttendance,
  overrideAttendance,
  getDailyAttendance,
  trackPresence,
  getAttendanceSummary,
  type LiveSession,
  type SessionPresenceEvent,
  type LiveAttendance,
  type DailyPresence
} from './attendance';
