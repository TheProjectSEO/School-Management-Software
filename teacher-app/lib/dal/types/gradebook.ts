/**
 * Gradebook Types for Teacher DAL
 *
 * These types define the structure of grading periods, grade weights,
 * course grades, and gradebook data for the teacher gradebook functionality.
 */

// ============================================================================
// Enums
// ============================================================================

export type GradingPeriodType = 'quarter' | 'semester' | 'trimester' | 'year'

export type AssessmentTypeForWeighting =
  | 'quiz'
  | 'exam'
  | 'assignment'
  | 'project'
  | 'participation'
  | 'midterm'
  | 'final'

export type CourseGradeStatus =
  | 'in_progress'
  | 'calculated'
  | 'released'
  | 'finalized'

export type AcademicStanding =
  | 'good_standing'
  | 'deans_list'
  | 'presidents_list'
  | 'probation'
  | 'suspension'

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Represents a grading period (quarter, semester, etc.)
 */
export interface GradingPeriod {
  id: string
  school_id: string
  name: string
  period_type: GradingPeriodType
  period_number: number
  academic_year: string
  start_date: string
  end_date: string
  is_current: boolean
  is_finalized: boolean
}

/**
 * Grade weight configuration for assessment types within a course
 */
export interface GradeWeightConfig {
  id: string
  course_id: string
  grading_period_id?: string
  assessment_type: AssessmentTypeForWeighting
  weight_percent: number
  drop_lowest: number
}

/**
 * A student's calculated grade for a course in a grading period
 */
export interface CourseGrade {
  id: string
  student_id: string
  course_id: string
  grading_period_id: string
  numeric_grade?: number
  letter_grade?: string
  gpa_points?: number
  credit_hours: number
  quality_points?: number
  status: CourseGradeStatus
  is_released: boolean
}

// ============================================================================
// Gradebook Data Structures
// ============================================================================

/**
 * Student information for gradebook display
 */
export interface GradebookStudent {
  student_id: string
  student_name: string
  lrn?: string
  profile_id: string
}

/**
 * Assessment score for a student
 */
export interface AssessmentScore {
  score?: number
  max_score: number
  status: string
  submission_id?: string
  pending_grading_count?: number // Number of items pending manual grading
}

/**
 * A single row in the gradebook representing a student's grades
 */
export interface GradebookRow {
  student: GradebookStudent
  assessmentScores: Map<string, AssessmentScore>
  courseGrade?: {
    numeric_grade?: number
    letter_grade?: string
  }
}

/**
 * Assessment summary for gradebook header
 */
export interface GradebookAssessment {
  id: string
  title: string
  type: string
  total_points: number
  due_date?: string
}

/**
 * Complete gradebook data for a course and grading period
 */
export interface GradebookData {
  course_id: string
  course_name: string
  grading_period: GradingPeriod
  assessments: GradebookAssessment[]
  rows: GradebookRow[]
  weight_config: GradeWeightConfig[]
}

// ============================================================================
// Input/Output Types for DAL Functions
// ============================================================================

/**
 * Input for creating/updating grade weights
 */
export type GradeWeightInput = Omit<GradeWeightConfig, 'id'>

/**
 * Entry for bulk grade entry
 */
export interface BulkGradeEntry {
  submission_id: string
  score: number
}

/**
 * Result of bulk grade entry operation
 */
export interface BulkGradeResult {
  success: number
  failed: number
}

/**
 * Calculated grade result
 */
export interface CalculatedGrade {
  numeric_grade: number
  letter_grade: string
  gpa_points: number
  quality_points: number
}
