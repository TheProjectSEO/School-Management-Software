/**
 * AI Module Types
 * Type definitions for AI interactions in the student portal
 */

// ============================================================================
// INTENT TYPES
// ============================================================================

/**
 * Question intent classification
 * Represents the type of question/request the student is making
 */
export type QuestionIntent =
  | "grades"        // Questions about grades, scores, academic performance
  | "schedule"      // Questions about class schedule, due dates, calendar
  | "assessment"    // Questions about quizzes, exams, assignments
  | "lesson"        // Questions about current lesson content
  | "progress"      // Questions about learning progress, completion
  | "recommendation"// Requests for study recommendations
  | "planning"      // Study planning, time management
  | "summary"       // Summaries of courses, modules, etc.
  | "help"          // General help and navigation
  | "general";      // General questions, fallback

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: QuestionIntent;
  confidence: number;
  keywords: string[];
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Student profile information for AI context
 */
export interface StudentProfile {
  id: string;
  name: string;
  gradeLevel?: string;
  sectionName?: string;
}

/**
 * Course information for AI context
 */
export interface CourseContext {
  id: string;
  name: string;
  code?: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  teacherName?: string;
}

/**
 * Module information for AI context
 */
export interface ModuleContext {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
}

/**
 * Assessment information for AI context
 */
export interface AssessmentContext {
  id: string;
  title: string;
  type: "quiz" | "exam" | "assignment" | "project";
  courseName: string;
  courseId: string;
  dueDate?: string;
  daysUntilDue: number;
  isOverdue: boolean;
  hasSubmission: boolean;
  score?: number;
  totalPoints?: number;
}

/**
 * Current lesson context
 */
export interface LessonContext {
  id: string;
  title: string;
  moduleTitle: string;
  courseName: string;
  courseId: string;
  contentType: "video" | "reading" | "quiz" | "activity";
  progressPercent: number;
  completed: boolean;
}

/**
 * Notification summary for AI context
 */
export interface NotificationContext {
  unreadCount: number;
  recentTypes: string[];
  hasUrgent: boolean;
}

/**
 * Study recommendation for AI context
 */
export interface RecommendationContext {
  type: "module" | "assessment" | "review";
  priority: "high" | "medium" | "low";
  title: string;
  courseName: string;
  courseId: string;
  moduleId?: string;
  assessmentId?: string;
  reason: string;
  description: string;
}

/**
 * Complete student context for AI interactions
 */
export interface StudentContext {
  profile: StudentProfile;
  courses: CourseContext[];
  upcomingAssessments: AssessmentContext[];
  incompleteModules: ModuleContext[];
  notifications: NotificationContext;
  recommendations: RecommendationContext[];
  currentLesson?: LessonContext;
  overallProgress: {
    averagePercent: number;
    totalCourses: number;
    completedCourses: number;
  };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Action card item for UI display
 */
export interface ActionCardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "red" | "orange" | "green" | "blue" | "purple";
  link: string;
  icon?: string;
  meta?: string;
}

/**
 * Action cards collection
 */
export interface ActionCards {
  type: "assessment" | "module" | "course";
  title: string;
  items: ActionCardItem[];
}

/**
 * Chat message in conversation
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  intent?: QuestionIntent;
}

/**
 * AI response structure
 */
export interface AIResponse {
  answer: string;
  followUpQuestions: string[];
  intent: QuestionIntent;
  contextUsed: string[];
  actionCards?: ActionCards;
  videoThumbnail?: string;
  videoTitle?: string;
  hasTranscript?: boolean;
  studentName: string;
  model: string;
}

// ============================================================================
// PROMPT BUILDER TYPES
// ============================================================================

/**
 * Options for building personalized prompts
 */
export interface PromptBuilderOptions {
  context: StudentContext;
  intent: QuestionIntent;
  lessonTranscript?: string;
}

/**
 * System prompt configuration
 */
export interface SystemPromptConfig {
  basePersonality: string;
  contextInstructions: string;
  responseGuidelines: string;
  followUpInstructions: string;
}
