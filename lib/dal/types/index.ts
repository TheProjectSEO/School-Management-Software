/**
 * DAL Types Index
 *
 * Re-exports all DAL types for convenient imports.
 */

// Re-export from gradebook, excluding types that are also defined in grades.ts
// The grades.ts versions are more complete (include timestamps and joined relations)
export {
  type GradingPeriodType,
  type AssessmentTypeForWeighting,
  type GradingPeriod,
  type GradeWeightConfig,
  type GradebookStudent,
  type AssessmentScore,
  type GradebookRow,
  type GradebookAssessment,
  type GradebookData,
  type GradeWeightInput,
  type BulkGradeEntry,
  type BulkGradeResult,
  type CalculatedGrade,
} from './gradebook'

export * from './attendance'
export * from './grades'
