/**
 * Assessment Builder Types
 *
 * Complete type definitions for the teacher assessment builder system.
 * Supports multiple question types and various content structures.
 */

// ============================================================================
// QUESTION TYPES
// ============================================================================

export type QuestionType =
  | 'multiple_choice_single'
  | 'multiple_choice_multi'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'matching'
  | 'fill_in_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// ============================================================================
// QUESTION CONTENT STRUCTURES
// ============================================================================

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceContent {
  type: 'multiple_choice_single' | 'multiple_choice_multi';
  options: MultipleChoiceOption[];
  allowPartialCredit?: boolean; // For multi-select
}

export interface TrueFalseContent {
  type: 'true_false';
  correctAnswer: boolean;
}

export interface ShortAnswerContent {
  type: 'short_answer';
  expectedAnswers: string[]; // Multiple acceptable answers
  caseSensitive: boolean;
  partialMatchAllowed: boolean;
}

export interface EssayContent {
  type: 'essay';
  minWords?: number;
  maxWords?: number;
  rubricGuidelines?: string;
  sampleAnswer?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingContent {
  type: 'matching';
  pairs: MatchingPair[];
  shuffleRight: boolean;
}

export interface FillInBlankContent {
  type: 'fill_in_blank';
  textWithBlanks: string; // Use [blank] or [blank:id] markers
  blanks: {
    id: string;
    acceptedAnswers: string[];
    caseSensitive: boolean;
  }[];
}

export type QuestionContent =
  | MultipleChoiceContent
  | TrueFalseContent
  | ShortAnswerContent
  | EssayContent
  | MatchingContent
  | FillInBlankContent;

// ============================================================================
// QUESTION ENTITIES
// ============================================================================

export interface BaseQuestion {
  id: string;
  prompt: string;
  explanation?: string;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestion extends BaseQuestion {
  assessmentId: string;
  orderIndex: number;
  content: QuestionContent;
}

// ============================================================================
// ASSESSMENT
// ============================================================================

export type AssessmentType = 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
export type AssessmentStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface AssessmentSettings {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showResults: 'immediately' | 'after_due_date' | 'never';
  showCorrectAnswers: boolean;
  allowBackNavigation: boolean;
  showQuestionNumbers: boolean;
  passwordProtected: boolean;
  password?: string;
  ipRestriction?: string[];
  browserLockdown: boolean;
}

export interface Assessment {
  id: string;
  subjectId?: string;
  sectionSubjectId?: string;
  courseId?: string;
  type: AssessmentType;
  title: string;
  description?: string;
  instructions?: string;
  settings: AssessmentSettings;
  rubricTemplateId?: string;
  openAt?: string;
  closeAt?: string;
  timeLimit?: number; // minutes
  attemptsAllowed: number;
  allowResubmission: boolean;
  status: AssessmentStatus;
  totalPoints: number;
  questionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// INPUT TYPES FOR API
// ============================================================================

export interface CreateQuestionInput {
  prompt: string;
  content: QuestionContent;
  explanation?: string;
  points: number;
  difficulty: DifficultyLevel;
  tags?: string[];
}

export interface UpdateQuestionInput {
  prompt?: string;
  content?: QuestionContent;
  explanation?: string;
  points?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
}

export interface AddQuestionToAssessmentInput {
  question?: CreateQuestionInput;
  orderIndex?: number;
}

export interface UpdateAssessmentSettingsInput {
  title?: string;
  description?: string;
  instructions?: string;
  settings?: Partial<AssessmentSettings>;
  openAt?: string;
  closeAt?: string;
  timeLimit?: number;
  attemptsAllowed?: number;
  allowResubmission?: boolean;
  status?: AssessmentStatus;
}

// ============================================================================
// FILTERS & QUERIES
// ============================================================================

export interface QuestionFilters {
  types?: QuestionType[];
  difficulties?: DifficultyLevel[];
  tags?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface EditorState {
  isPreviewMode: boolean;
  isDirty: boolean;
  validationErrors: string[];
}

export interface QuestionEditorProps {
  value: CreateQuestionInput | null;
  onChange: (question: CreateQuestionInput) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface TypeSpecificEditorProps<T extends QuestionContent> {
  value: T;
  onChange: (content: T) => void;
  disabled?: boolean;
}

// Helper type for question type icons
export const QUESTION_TYPE_CONFIG: Record<QuestionType, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  multiple_choice_single: {
    label: 'Multiple Choice (Single)',
    icon: 'radio_button_checked',
    description: 'Select one correct answer',
    color: 'blue',
  },
  multiple_choice_multi: {
    label: 'Multiple Choice (Multi)',
    icon: 'check_box',
    description: 'Select multiple correct answers',
    color: 'indigo',
  },
  true_false: {
    label: 'True/False',
    icon: 'toggle_on',
    description: 'Choose true or false',
    color: 'green',
  },
  short_answer: {
    label: 'Short Answer',
    icon: 'short_text',
    description: 'Enter a brief text response',
    color: 'amber',
  },
  essay: {
    label: 'Essay',
    icon: 'article',
    description: 'Extended written response',
    color: 'purple',
  },
  matching: {
    label: 'Matching',
    icon: 'swap_horiz',
    description: 'Match pairs of items',
    color: 'teal',
  },
  fill_in_blank: {
    label: 'Fill in the Blank',
    icon: 'text_fields',
    description: 'Complete sentences with missing words',
    color: 'orange',
  },
};

// Utility function to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default question content creators
export function createDefaultContent(type: QuestionType): QuestionContent {
  switch (type) {
    case 'multiple_choice_single':
    case 'multiple_choice_multi':
      return {
        type,
        options: [
          { id: generateId(), text: '', isCorrect: false },
          { id: generateId(), text: '', isCorrect: false },
          { id: generateId(), text: '', isCorrect: false },
          { id: generateId(), text: '', isCorrect: false },
        ],
        allowPartialCredit: type === 'multiple_choice_multi',
      };
    case 'true_false':
      return {
        type: 'true_false',
        correctAnswer: true,
      };
    case 'short_answer':
      return {
        type: 'short_answer',
        expectedAnswers: [''],
        caseSensitive: false,
        partialMatchAllowed: false,
      };
    case 'essay':
      return {
        type: 'essay',
        minWords: undefined,
        maxWords: undefined,
        rubricGuidelines: '',
        sampleAnswer: '',
      };
    case 'matching':
      return {
        type: 'matching',
        pairs: [
          { id: generateId(), left: '', right: '' },
          { id: generateId(), left: '', right: '' },
        ],
        shuffleRight: true,
      };
    case 'fill_in_blank':
      return {
        type: 'fill_in_blank',
        textWithBlanks: 'The [blank] is a sentence with blanks.',
        blanks: [
          { id: 'blank', acceptedAnswers: [''], caseSensitive: false },
        ],
      };
    default:
      throw new Error(`Unknown question type: ${type}`);
  }
}
