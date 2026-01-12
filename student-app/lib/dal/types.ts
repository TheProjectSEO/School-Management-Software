/**
 * Database types for MSU Student Portal
 * Aligned with actual Supabase schema
 */

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  profile_id: string;
  lrn?: string;
  grade_level?: string;
  section_id?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface School {
  id: string;
  slug: string;
  name: string;
  region?: string;
  division?: string;
  logo_url?: string;
  accent_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  school_id: string;
  name: string;
  grade_level?: string;
  adviser_teacher_id?: string;
  created_at: string;
  updated_at: string;
}

// Course is the "subject" in the MSU context
export interface Course {
  id: string;
  school_id: string;
  section_id: string;
  name: string;
  subject_code?: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

// Alias for semantic clarity
export type Subject = Course;

export interface Enrollment {
  id: string;
  school_id: string;
  student_id: string;
  course_id: string;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order: number;
  duration_minutes?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content?: string;
  content_type: "video" | "reading" | "quiz" | "activity";
  video_url?: string;
  duration_minutes?: number;
  order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  school_id: string;
  course_id: string;
  title: string;
  description?: string;
  type: "quiz" | "exam" | "assignment" | "project";
  due_date?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface Submission {
  id: string;
  assessment_id: string;
  student_id: string;
  score?: number;
  submitted_at: string;
  graded_at?: string;
  feedback?: string;
  status: "pending" | "submitted" | "graded";
  attempt_number?: number;
}

// Alias for compatibility
export type AssessmentSubmission = Submission;

export interface Progress {
  id: string;
  student_id: string;
  course_id: string;
  lesson_id?: string;
  progress_percent: number;
  completed_at?: string;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  student_id: string;
  course_id?: string;
  lesson_id?: string;
  title: string;
  content?: string;
  type: "note" | "highlight" | "bookmark";
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  student_id: string;
  type: "info" | "success" | "warning" | "error" | "assignment" | "grade" | "announcement";
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  announcement_id?: string; // Links to teacher_announcements if type='announcement'
  created_at: string;
}

// Announcement from teacher_announcements table
export interface Announcement {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  content: string;
  target_type: "section" | "grade" | "course" | "school";
  target_section_ids?: string[];
  target_grade_levels?: string[];
  target_course_ids?: string[];
  priority: "low" | "normal" | "high" | "urgent";
  is_published: boolean;
  published_at?: string;
  expires_at?: string;
  attachments?: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
  // Joined data
  teacher?: {
    id: string;
    profile?: {
      full_name: string;
      avatar_url?: string;
    };
  };
  is_read?: boolean; // Computed from announcement_reads
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  student_id: string;
  read_at: string;
}

export interface Download {
  id: string;
  student_id: string;
  lesson_id?: string;
  module_id?: string;
  title: string;
  file_url: string;
  file_size_bytes: number;
  file_type?: string;
  status: "ready" | "syncing" | "queued" | "error";
  created_at: string;
}

// Quiz/Question types
export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  points: number;
  correct_answer?: string;
  explanation?: string;
  order_index: number;
  created_at: string;
  options?: AnswerOption[];
}

export interface AnswerOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface StudentAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_id?: string;
  text_answer?: string;
  is_correct?: boolean;
  points_earned: number;
  created_at: string;
}

// Extended Assessment with quiz fields
export interface AssessmentWithDetails extends Assessment {
  time_limit_minutes?: number;
  instructions?: string;
  max_attempts?: number;
  questions?: Question[];
}

// Quiz submission payload
export interface QuizSubmissionPayload {
  answers: {
    question_id: string;
    selected_option_id?: string;
    text_answer?: string;
  }[];
  time_spent_seconds: number;
}

// Quiz result
export interface QuizResult {
  submission_id: string;
  score: number;
  total_points: number;
  percentage: number;
  answers: (StudentAnswer & {
    question: Question;
    selected_option?: AnswerOption;
  })[];
}

// Query result types
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

// ============================================================================
// MESSAGING TYPES
// ============================================================================

export interface Teacher {
  id: string;
  school_id: string;
  profile_id: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface DirectMessage {
  id: string;
  school_id: string;
  from_profile_id: string;
  to_profile_id: string;
  body: string;
  attachments_json?: Record<string, unknown>[];
  sender_type: "teacher" | "student";
  is_read: boolean;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
  // Joined data
  from_user?: Profile;
  to_user?: Profile;
}

// ============================================================================
// REAL-TIME MESSAGING TYPES
// ============================================================================

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface RealtimeMessage extends DirectMessage {
  status?: MessageStatus;
  tempId?: string; // For optimistic updates
}

export interface TypingState {
  isTyping: boolean;
  profileId: string;
  profileName?: string;
  timestamp: number;
}

export interface PresenceState {
  profileId: string;
  status: "online" | "offline";
  lastSeen?: string;
}

export interface MessageNotificationPayload {
  message: DirectMessage;
  senderName: string;
  senderAvatar?: string;
}

export interface Conversation {
  partner_profile_id: string;
  partner_name: string;
  partner_avatar_url?: string;
  partner_role: "teacher" | "student";
  last_message_body: string;
  last_message_at: string;
  last_message_sender_type: "teacher" | "student";
  unread_count: number;
  total_messages: number;
  // Additional context for student app
  teacher_id?: string;
  course_name?: string;
}

export interface MessageQuota {
  can_send: boolean;
  remaining: number;
  used: number;
  max: number;
  resets_at: string;
}

export interface SendMessageResult {
  success: boolean;
  message_id?: string;
  error?: string;
  message?: string;
  quota?: MessageQuota;
}
