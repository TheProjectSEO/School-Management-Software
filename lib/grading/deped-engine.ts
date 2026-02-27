/**
 * DepEd K-12 Grading Engine
 *
 * Pure computation functions implementing the Department of Education
 * grading policy for Grades 1-12.
 *
 * Computation order:
 *   Raw Scores → Percentage Score → Weighted Score →
 *   Initial Grade → Transmuted Grade → Quarterly Grade →
 *   Final Grade → General Average → Honors
 */

// ============================================================================
// Types
// ============================================================================

export type DepEdSubjectType = 'academic' | 'mapeh' | 'tle'
export type DepEdComponent = 'written_work' | 'performance_task' | 'quarterly_assessment'
export type TransmutationMethod = 'formula' | 'table'

export interface DepEdWeights {
  written_work: number         // decimal, e.g. 0.30
  performance_task: number     // e.g. 0.50
  quarterly_assessment: number // e.g. 0.20
}

export interface ComponentScores {
  totalScore: number
  highestPossibleScore: number
}

export interface ComponentBreakdown extends ComponentScores {
  percentageScore: number  // (total / highest) * 100
  weightedScore: number    // percentageScore * weight
}

export interface QuarterGradeBreakdown {
  ww: ComponentBreakdown
  pt: ComponentBreakdown
  qa: ComponentBreakdown
  initialGrade: number    // ww.weighted + pt.weighted + qa.weighted
  transmutedGrade: number // after transmutation
  quarterlyGrade: number  // rounded to whole number, clamped 60-100
}

export interface HonorsResult {
  status: 'with_honors' | 'with_high_honors' | 'with_highest_honors' | null
  qualifies: boolean
  reason?: string
}

// ============================================================================
// Weight Configuration
// ============================================================================

/**
 * Returns DepEd-prescribed component weights for a given subject type.
 * Academic subjects: WW 30%, PT 50%, QA 20%
 * MAPEH / TLE:       WW 20%, PT 60%, QA 20%
 */
export function getWeights(subjectType: DepEdSubjectType): DepEdWeights {
  if (subjectType === 'academic') {
    return {
      written_work: 0.30,
      performance_task: 0.50,
      quarterly_assessment: 0.20,
    }
  }
  // mapeh and tle share the same weights
  return {
    written_work: 0.20,
    performance_task: 0.60,
    quarterly_assessment: 0.20,
  }
}

// ============================================================================
// Step A — Percentage Score
// ============================================================================

/**
 * STEP A: Convert raw scores to Percentage Score.
 * Formula: (totalScore / highestPossibleScore) × 100
 *
 * Returns 0 if highestPossibleScore is 0 to prevent division by zero.
 */
export function computePercentageScore(
  totalScore: number,
  highestPossibleScore: number
): number {
  if (highestPossibleScore <= 0) return 0
  return (totalScore / highestPossibleScore) * 100
}

// ============================================================================
// Step B — Initial Grade
// ============================================================================

/**
 * STEP B: Apply component weights and compute Initial Grade.
 * Formula: (PS_WW × ww_weight) + (PS_PT × pt_weight) + (PS_QA × qa_weight)
 */
export function computeInitialGrade(
  ps_ww: number,
  ps_pt: number,
  ps_qa: number,
  weights: DepEdWeights
): number {
  return (
    ps_ww * weights.written_work +
    ps_pt * weights.performance_task +
    ps_qa * weights.quarterly_assessment
  )
}

// ============================================================================
// Step C — Transmutation
// ============================================================================

/**
 * Official DepEd transmutation lookup table
 * Based on DepEd Order No. 8, s. 2015
 * Maps Initial Grade ranges to Transmuted Grade (60-100 scale)
 */
const DEPED_TRANSMUTATION_TABLE: Array<{
  min: number
  max: number
  transmuted: number
}> = [
  { min: 100.00, max: 100.00, transmuted: 100 },
  { min:  98.40, max:  99.99, transmuted:  99 },
  { min:  96.80, max:  98.39, transmuted:  98 },
  { min:  95.20, max:  96.79, transmuted:  97 },
  { min:  93.60, max:  95.19, transmuted:  96 },
  { min:  92.00, max:  93.59, transmuted:  95 },
  { min:  90.40, max:  91.99, transmuted:  94 },
  { min:  88.80, max:  90.39, transmuted:  93 },
  { min:  87.20, max:  88.79, transmuted:  92 },
  { min:  85.60, max:  87.19, transmuted:  91 },
  { min:  84.00, max:  85.59, transmuted:  90 },
  { min:  82.40, max:  83.99, transmuted:  89 },
  { min:  80.80, max:  82.39, transmuted:  88 },
  { min:  79.20, max:  80.79, transmuted:  87 },
  { min:  77.60, max:  79.19, transmuted:  86 },
  { min:  76.00, max:  77.59, transmuted:  85 },
  { min:  74.40, max:  75.99, transmuted:  84 },
  { min:  72.80, max:  74.39, transmuted:  83 },
  { min:  71.20, max:  72.79, transmuted:  82 },
  { min:  69.60, max:  71.19, transmuted:  81 },
  { min:  68.00, max:  69.59, transmuted:  80 },
  { min:  66.40, max:  67.99, transmuted:  79 },
  { min:  64.80, max:  66.39, transmuted:  78 },
  { min:  63.20, max:  64.79, transmuted:  77 },
  { min:  61.60, max:  63.19, transmuted:  76 },
  { min:  60.00, max:  61.59, transmuted:  75 },
  { min:  56.00, max:  59.99, transmuted:  74 },
  { min:  52.00, max:  55.99, transmuted:  73 },
  { min:  48.00, max:  51.99, transmuted:  72 },
  { min:  44.00, max:  47.99, transmuted:  71 },
  { min:  40.00, max:  43.99, transmuted:  70 },
  { min:  36.00, max:  39.99, transmuted:  69 },
  { min:  32.00, max:  35.99, transmuted:  68 },
  { min:  28.00, max:  31.99, transmuted:  67 },
  { min:  24.00, max:  27.99, transmuted:  66 },
  { min:  20.00, max:  23.99, transmuted:  65 },
  { min:  16.00, max:  19.99, transmuted:  64 },
  { min:  12.00, max:  15.99, transmuted:  63 },
  { min:   8.00, max:  11.99, transmuted:  62 },
  { min:   4.00, max:   7.99, transmuted:  61 },
  { min:   0.00, max:   3.99, transmuted:  60 },
]

/**
 * Lookup transmuted grade using the official DepEd table.
 */
function transmuteByTable(initialGrade: number): number {
  const clamped = Math.max(0, Math.min(100, initialGrade))
  const entry = DEPED_TRANSMUTATION_TABLE.find(
    (row) => clamped >= row.min && clamped <= row.max
  )
  return entry?.transmuted ?? 60
}

/**
 * Compute transmuted grade using simplified formula.
 * Formula: 60 + (initialGrade × 0.40)
 */
function transmuteByFormula(initialGrade: number): number {
  return 60 + initialGrade * 0.40
}

/**
 * STEP C: Transmute Initial Grade to Quarterly Grade scale (60-100).
 * Supports both official lookup table (default) and simplified formula.
 */
export function transmuteGrade(
  initialGrade: number,
  method: TransmutationMethod = 'table'
): number {
  if (method === 'formula') {
    return transmuteByFormula(initialGrade)
  }
  return transmuteByTable(initialGrade)
}

// ============================================================================
// Full Quarter Grade Computation
// ============================================================================

/**
 * Computes the complete quarterly grade breakdown for a single student
 * in a single subject for one grading period.
 *
 * Steps A → B → C → round to whole number, clamp to 60-100.
 */
export function computeQuarterGrade(
  wwScores: ComponentScores,
  ptScores: ComponentScores,
  qaScores: ComponentScores,
  subjectType: DepEdSubjectType,
  method: TransmutationMethod = 'table'
): QuarterGradeBreakdown {
  const weights = getWeights(subjectType)

  // Step A: Percentage Scores
  const ps_ww = computePercentageScore(wwScores.totalScore, wwScores.highestPossibleScore)
  const ps_pt = computePercentageScore(ptScores.totalScore, ptScores.highestPossibleScore)
  const ps_qa = computePercentageScore(qaScores.totalScore, qaScores.highestPossibleScore)

  // Step B: Weighted Scores
  const ws_ww = ps_ww * weights.written_work
  const ws_pt = ps_pt * weights.performance_task
  const ws_qa = ps_qa * weights.quarterly_assessment

  const initialGrade = ws_ww + ws_pt + ws_qa

  // Step C: Transmutation
  const transmutedGrade = transmuteGrade(initialGrade, method)

  // Round and clamp: minimum 60, maximum 100
  const quarterlyGrade = Math.max(60, Math.min(100, Math.round(transmutedGrade)))

  return {
    ww: {
      totalScore: wwScores.totalScore,
      highestPossibleScore: wwScores.highestPossibleScore,
      percentageScore: ps_ww,
      weightedScore: ws_ww,
    },
    pt: {
      totalScore: ptScores.totalScore,
      highestPossibleScore: ptScores.highestPossibleScore,
      percentageScore: ps_pt,
      weightedScore: ws_pt,
    },
    qa: {
      totalScore: qaScores.totalScore,
      highestPossibleScore: qaScores.highestPossibleScore,
      percentageScore: ps_qa,
      weightedScore: ws_qa,
    },
    initialGrade,
    transmutedGrade,
    quarterlyGrade,
  }
}

// ============================================================================
// Step 4 — Final Grade
// ============================================================================

/**
 * Compute the yearly Final Grade for a single subject.
 * Formula: (Q1 + Q2 + Q3 + Q4) / 4, rounded to whole number.
 *
 * Null quarters are excluded from the average (handles mid-year students).
 */
export function computeFinalGrade(
  q1?: number | null,
  q2?: number | null,
  q3?: number | null,
  q4?: number | null
): number | null {
  const quarters = [q1, q2, q3, q4].filter(
    (q): q is number => q !== null && q !== undefined
  )
  if (quarters.length === 0) return null
  const sum = quarters.reduce((acc, q) => acc + q, 0)
  return Math.round(sum / quarters.length)
}

// ============================================================================
// Step 5 — General Average
// ============================================================================

/**
 * Compute the General Average across all subjects.
 * Formula: Sum of all Final Subject Grades / Total Number of Subjects
 */
export function computeGeneralAverage(finalGrades: number[]): number | null {
  const valid = finalGrades.filter((g) => g !== null && g !== undefined)
  if (valid.length === 0) return null
  const sum = valid.reduce((acc, g) => acc + g, 0)
  return Math.round((sum / valid.length) * 100) / 100 // keep 2 decimal places
}

// ============================================================================
// Step 6 — Honors
// ============================================================================

/**
 * Determine honors eligibility per DepEd policy.
 *
 * Requirements for all levels:
 *   - No subject final grade below 85
 *   - General average within qualifying range
 *
 * With Honors:         GA 90–94
 * With High Honors:    GA 95–97
 * With Highest Honors: GA 98–100
 */
export function checkHonors(
  generalAverage: number,
  finalGrades: number[]
): HonorsResult {
  const lowestGrade = Math.min(...finalGrades)

  if (lowestGrade < 85) {
    return {
      status: null,
      qualifies: false,
      reason: `Has a subject grade of ${lowestGrade} (minimum 85 required for honors)`,
    }
  }

  const ga = Math.round(generalAverage)

  if (ga >= 98) {
    return { status: 'with_highest_honors', qualifies: true }
  }
  if (ga >= 95) {
    return { status: 'with_high_honors', qualifies: true }
  }
  if (ga >= 90) {
    return { status: 'with_honors', qualifies: true }
  }

  return {
    status: null,
    qualifies: false,
    reason: `General average ${ga} is below 90 (minimum for honors)`,
  }
}

// ============================================================================
// Utility — Human-readable labels
// ============================================================================

export const HONORS_LABELS: Record<string, string> = {
  with_honors: 'With Honors',
  with_high_honors: 'With High Honors',
  with_highest_honors: 'With Highest Honors',
}

export const SUBJECT_TYPE_LABELS: Record<DepEdSubjectType, string> = {
  academic: 'Academic (WW 30% | PT 50% | QA 20%)',
  mapeh: 'MAPEH (WW 20% | PT 60% | QA 20%)',
  tle: 'TLE (WW 20% | PT 60% | QA 20%)',
}

export const COMPONENT_LABELS: Record<DepEdComponent, string> = {
  written_work: 'Written Work',
  performance_task: 'Performance Task',
  quarterly_assessment: 'Quarterly Assessment',
}

/** Returns the passing status label for a quarterly/final grade */
export function gradeStatus(grade: number): 'passed' | 'failed' {
  return grade >= 75 ? 'passed' : 'failed'
}
