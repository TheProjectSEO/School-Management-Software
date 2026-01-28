// Types for the Personalized AI Learning Assistant

export interface StudentProfile {
  // Primary identifiers
  id: string;                    // Student UUID (primary key)
  studentId: string;             // Same as id - explicitly labeled for AI clarity
  lrn: string | null;            // Learner Reference Number (school-assigned student number)

  // Personal information
  name: string;
  email: string | null;          // From auth or profiles
  phone: string | null;          // From profiles
  avatarUrl: string | null;

  // Academic information
  gradeLevel: string | null;
  section: string | null;        // Section name
  sectionId: string | null;      // Section UUID
  schoolName: string;
  schoolId: string | null;       // School UUID

  // Enrollment information
  enrollmentIds: string[];       // All enrollment UUIDs
  enrolledCourseIds: string[];   // All course UUIDs student is enrolled in
  enrollmentDate: Date | null;   // When first enrolled (from earliest enrollment)

  // Account information
  profileId: string | null;      // Profile UUID
  accountCreatedAt: Date | null; // When account was created
}

export interface CourseProgress {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: Date | null;
}

export interface ModuleProgress {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
  order: number;
}

export interface UpcomingAssessment {
  id: string;
  title: string;
  type: "quiz" | "exam" | "assignment" | "project";
  courseName: string;
  courseCode: string | null;
  dueDate: Date;
  daysUntilDue: number;
  totalPoints: number;
  isOverdue: boolean;
}

export interface RecentSubmission {
  id: string;
  assessmentTitle: string;
  assessmentType: string;
  courseName: string;
  score: number | null;
  totalPoints: number;
  percentScore: number | null;
  status: "pending" | "submitted" | "graded";
  feedback: string | null;
  submittedAt: Date;
}

export interface NotificationSummary {
  unreadCount: number;
  totalCount: number;
  recent: {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }[];
  byType: {
    announcements: number;
    assignments: number;
    grades: number;
    general: number;
  };
}

export interface LearningStats {
  overallProgress: number;
  coursesEnrolled: number;
  modulesCompleted: number;
  totalModules: number;
  lessonsCompleted: number;
  totalLessons: number;
  assessmentsPending: number;
  assessmentsCompleted: number;
  averageScore: number | null;
  notesCount: number;
  downloadsCount: number;
}

export interface Recommendation {
  type: "module" | "assessment" | "review" | "catchup";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  courseName: string;
  courseId: string;
  moduleId?: string;
  assessmentId?: string;
  reason: string;
}

export interface StudentContext {
  profile: StudentProfile;
  courses: CourseProgress[];
  incompleteModules: ModuleProgress[];
  upcomingAssessments: UpcomingAssessment[];
  recentSubmissions: RecentSubmission[];
  notifications: NotificationSummary;
  stats: LearningStats;
  recommendations: Recommendation[];
  currentLesson?: {
    id: string;
    title: string;
    courseName: string;
    moduleTitle: string;
    videoUrl: string | null;
    transcript: string | null;
  };
}

export type QuestionIntent =
  | "progress"
  | "schedule"
  | "recommendation"
  | "summary"
  | "assessment"
  | "personal"
  | "planning"
  | "lesson"
  | "general";

export interface IntentClassification {
  intent: QuestionIntent;
  confidence: number;
  keywords: string[];
}

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

export type ActionCardType = "assessment" | "module" | "course" | "notification";

export interface ActionCards {
  type: ActionCardType;
  items: ActionCardItem[];
  title?: string;
}

export interface AIResponse {
  answer: string;
  followUpQuestions: string[];
  intent: QuestionIntent;
  contextUsed: string[];
  actionCards?: ActionCards;
}
