/**
 * Teacher Gradebook Data Access Layer
 *
 * Provides functions for managing gradebook data including grading periods,
 * grade weights, course grades, and bulk grade entry operations.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  GradingPeriod,
  GradeWeightConfig,
  GradeWeightInput,
  CourseGrade,
  GradebookData,
  GradebookRow,
  GradebookAssessment,
  BulkGradeEntry,
  BulkGradeResult,
  AssessmentScore,
} from '../types/gradebook'

// ============================================================================
// Grading Period Functions
// ============================================================================

/**
 * Get all grading periods for a school
 */
export async function getGradingPeriods(schoolId: string): Promise<GradingPeriod[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('grading_periods')
    .select('*')
    .eq('school_id', schoolId)
    .order('academic_year', { ascending: false })
    .order('period_number', { ascending: true })

  if (error) {
    console.error('Error fetching grading periods:', error)
    return []
  }

  return data as GradingPeriod[]
}

/**
 * Get the current active grading period for a school
 */
export async function getCurrentGradingPeriod(schoolId: string): Promise<GradingPeriod | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('grading_periods')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()

  if (error) {
    // If no current period is explicitly set, try to find one based on dates
    if (error.code === 'PGRST116') {
      return findGradingPeriodByDate(schoolId)
    }
    console.error('Error fetching current grading period:', error)
    return null
  }

  return data as GradingPeriod
}

/**
 * Find grading period by current date
 */
async function findGradingPeriodByDate(schoolId: string): Promise<GradingPeriod | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('grading_periods')
    .select('*')
    .eq('school_id', schoolId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('period_number', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    console.error('Error finding grading period by date:', error)
    return null
  }

  return data as GradingPeriod
}

// ============================================================================
// Grade Weight Functions
// ============================================================================

/**
 * Get grade weight configuration for a course
 */
export async function getGradeWeights(
  courseId: string,
  gradingPeriodId?: string
): Promise<GradeWeightConfig[]> {
  const supabase = await createClient()

  let query = supabase
    .from('grade_weight_configs')
    .select('*')
    .eq('course_id', courseId)

  if (gradingPeriodId) {
    // Get period-specific weights, or course-level weights if none exist
    query = query.or(`grading_period_id.eq.${gradingPeriodId},grading_period_id.is.null`)
  } else {
    // Get course-level weights only
    query = query.is('grading_period_id', null)
  }

  const { data, error } = await query.order('assessment_type', { ascending: true })

  if (error) {
    console.error('Error fetching grade weights:', error)
    return []
  }

  // If we have both period-specific and course-level weights,
  // prefer period-specific weights
  if (gradingPeriodId && data) {
    const periodWeights = data.filter(w => w.grading_period_id === gradingPeriodId)
    if (periodWeights.length > 0) {
      return periodWeights as GradeWeightConfig[]
    }
  }

  return data as GradeWeightConfig[]
}

/**
 * Save grade weight configuration for a course
 */
export async function saveGradeWeights(
  courseId: string,
  weights: GradeWeightInput[]
): Promise<boolean> {
  const supabase = await createClient()

  // Validate that weights sum to 100%
  const totalWeight = weights.reduce((sum, w) => sum + w.weight_percent, 0)
  if (Math.abs(totalWeight - 100) > 0.01) {
    console.error('Grade weights must sum to 100%')
    return false
  }

  // Get the grading period ID from the first weight (they should all be the same)
  const gradingPeriodId = weights[0]?.grading_period_id

  // Delete existing weights for this course and period
  let deleteQuery = supabase
    .from('grade_weight_configs')
    .delete()
    .eq('course_id', courseId)

  if (gradingPeriodId) {
    deleteQuery = deleteQuery.eq('grading_period_id', gradingPeriodId)
  } else {
    deleteQuery = deleteQuery.is('grading_period_id', null)
  }

  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    console.error('Error deleting existing grade weights:', deleteError)
    return false
  }

  // Insert new weights
  const weightsToInsert = weights.map(w => ({
    course_id: courseId,
    grading_period_id: w.grading_period_id || null,
    assessment_type: w.assessment_type,
    weight_percent: w.weight_percent,
    drop_lowest: w.drop_lowest,
  }))

  const { error: insertError } = await supabase
    .from('grade_weight_configs')
    .insert(weightsToInsert)

  if (insertError) {
    console.error('Error inserting grade weights:', insertError)
    return false
  }

  return true
}

// ============================================================================
// Gradebook Data Functions
// ============================================================================

/**
 * Get complete gradebook data for a course and grading period
 */
export async function getGradebookData(
  teacherId: string,
  courseId: string,
  gradingPeriodId: string
): Promise<GradebookData | null> {
  const supabase = await createClient()

  // Verify teacher has access to this course
  const hasAccess = await verifyTeacherCourseAccess(teacherId, courseId)
  if (!hasAccess) {
    console.error('Teacher does not have access to this course')
    return null
  }

  // Get course info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    console.error('Error fetching course:', courseError)
    return null
  }

  // Get grading period
  const { data: gradingPeriod, error: periodError } = await supabase
    .from('grading_periods')
    .select('*')
    .eq('id', gradingPeriodId)
    .single()

  if (periodError || !gradingPeriod) {
    console.error('Error fetching grading period:', periodError)
    return null
  }

  // Get assessments for this course within the grading period
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, title, type, total_points, due_date')
    .eq('course_id', courseId)
    .gte('due_date', gradingPeriod.start_date)
    .lte('due_date', gradingPeriod.end_date)
    .order('due_date', { ascending: true })

  if (assessmentsError) {
    console.error('Error fetching assessments:', assessmentsError)
    return null
  }

  // Get enrolled students
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select(`
      student_id,
      student:students!inner(
        id,
        lrn,
        profile_id,
        profile:school_profiles!inner(full_name)
      )
    `)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .order('student(profile(full_name))', { ascending: true })

  if (enrollmentsError) {
    console.error('Error fetching enrollments:', enrollmentsError)
    return null
  }

  // Get grade weights
  const weightConfig = await getGradeWeights(courseId, gradingPeriodId)

  // Build gradebook rows
  const rows: GradebookRow[] = await Promise.all(
    enrollments.map(async (enrollment: any) => {
      const studentData = enrollment.student

      // Get all submissions for this student for the assessments
      const assessmentIds = assessments?.map(a => a.id) || []
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, assessment_id, score, status')
        .eq('student_id', studentData.id)
        .in('assessment_id', assessmentIds)

      // Get pending grading counts for this student's submissions
      const submissionIds = submissions?.map(s => s.id) || []
      let pendingCounts: Record<string, number> = {}

      if (submissionIds.length > 0) {
        const { data: pendingItems } = await supabase
          .from('teacher_grading_queue')
          .select('submission_id')
          .in('submission_id', submissionIds)
          .eq('status', 'pending')

        if (pendingItems) {
          pendingCounts = pendingItems.reduce((acc: Record<string, number>, item) => {
            acc[item.submission_id] = (acc[item.submission_id] || 0) + 1
            return acc
          }, {})
        }
      }

      // Build assessment scores map
      const assessmentScores = new Map<string, AssessmentScore>()
      assessments?.forEach(assessment => {
        const submission = submissions?.find(s => s.assessment_id === assessment.id)
        assessmentScores.set(assessment.id, {
          score: submission?.score ?? undefined,
          max_score: assessment.total_points,
          status: submission?.status || 'not_submitted',
          submission_id: submission?.id,
          pending_grading_count: submission ? (pendingCounts[submission.id] || 0) : 0,
        })
      })

      // Get course grade if exists
      const { data: courseGrade } = await supabase
        .from('course_grades')
        .select('numeric_grade, letter_grade')
        .eq('student_id', studentData.id)
        .eq('course_id', courseId)
        .eq('grading_period_id', gradingPeriodId)
        .single()

      return {
        student: {
          student_id: studentData.id,
          student_name: studentData.profile.full_name,
          lrn: studentData.lrn,
          profile_id: studentData.profile_id,
        },
        assessmentScores,
        courseGrade: courseGrade
          ? {
              numeric_grade: courseGrade.numeric_grade,
              letter_grade: courseGrade.letter_grade,
            }
          : undefined,
      } as GradebookRow
    })
  )

  return {
    course_id: course.id,
    course_name: course.name,
    grading_period: gradingPeriod as GradingPeriod,
    assessments: (assessments || []) as GradebookAssessment[],
    rows,
    weight_config: weightConfig,
  }
}

// ============================================================================
// Grade Entry Functions
// ============================================================================

/**
 * Update a single submission score
 */
export async function updateSubmissionScore(
  submissionId: string,
  score: number
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('submissions')
    .update({
      score,
      status: 'graded',
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) {
    console.error('Error updating submission score:', error)
    return false
  }

  return true
}

/**
 * Bulk enter grades for multiple submissions
 */
export async function bulkEnterGrades(
  entries: BulkGradeEntry[]
): Promise<BulkGradeResult> {
  const results: BulkGradeResult = { success: 0, failed: 0 }

  // Process in parallel with Promise.allSettled for resilience
  const updatePromises = entries.map(async (entry) => {
    const success = await updateSubmissionScore(entry.submission_id, entry.score)
    return { success, entry }
  })

  const settledResults = await Promise.allSettled(updatePromises)

  settledResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.success) {
      results.success++
    } else {
      results.failed++
    }
  })

  return results
}

// ============================================================================
// Course Grade Functions
// ============================================================================

/**
 * Calculate and store course grade for a student
 */
export async function calculateCourseGrade(
  studentId: string,
  courseId: string,
  gradingPeriodId: string
): Promise<CourseGrade | null> {
  const supabase = await createClient()

  // Get grading period dates
  const { data: gradingPeriod, error: periodError } = await supabase
    .from('grading_periods')
    .select('start_date, end_date')
    .eq('id', gradingPeriodId)
    .single()

  if (periodError || !gradingPeriod) {
    console.error('Error fetching grading period:', periodError)
    return null
  }

  // Get grade weights
  const weights = await getGradeWeights(courseId, gradingPeriodId)
  if (weights.length === 0) {
    console.error('No grade weights configured for course')
    return null
  }

  // Get all assessments for the course in this grading period
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, type, total_points')
    .eq('course_id', courseId)
    .gte('due_date', gradingPeriod.start_date)
    .lte('due_date', gradingPeriod.end_date)

  if (assessmentsError) {
    console.error('Error fetching assessments:', assessmentsError)
    return null
  }

  // Get student's submissions
  const assessmentIds = assessments?.map(a => a.id) || []
  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select('assessment_id, score')
    .eq('student_id', studentId)
    .in('assessment_id', assessmentIds)
    .eq('status', 'graded')

  if (submissionsError) {
    console.error('Error fetching submissions:', submissionsError)
    return null
  }

  // Calculate weighted grade
  const gradeByType: { [key: string]: { earned: number; possible: number; count: number }[] } = {}

  // Group assessments and scores by type
  assessments?.forEach((assessment) => {
    const type = assessment.type
    if (!gradeByType[type]) {
      gradeByType[type] = []
    }

    const submission = submissions?.find(s => s.assessment_id === assessment.id)
    gradeByType[type].push({
      earned: submission?.score ?? 0,
      possible: assessment.total_points,
      count: submission?.score !== undefined ? 1 : 0,
    })
  })

  // Apply weights and calculate final grade
  let totalWeightedScore = 0
  let totalWeight = 0

  weights.forEach((weight) => {
    const typeScores = gradeByType[weight.assessment_type]
    if (!typeScores || typeScores.length === 0) return

    // Sort by score percentage (lowest first) for drop_lowest
    const sortedScores = [...typeScores].sort((a, b) => {
      const percA = a.possible > 0 ? a.earned / a.possible : 0
      const percB = b.possible > 0 ? b.earned / b.possible : 0
      return percA - percB
    })

    // Drop lowest scores if configured
    const scoresToUse = sortedScores.slice(weight.drop_lowest)

    // Calculate percentage for this type
    const totalEarned = scoresToUse.reduce((sum, s) => sum + s.earned, 0)
    const totalPossible = scoresToUse.reduce((sum, s) => sum + s.possible, 0)

    if (totalPossible > 0) {
      const typePercentage = (totalEarned / totalPossible) * 100
      totalWeightedScore += typePercentage * (weight.weight_percent / 100)
      totalWeight += weight.weight_percent
    }
  })

  // Normalize if not all weight categories have assessments
  const numericGrade = totalWeight > 0
    ? (totalWeightedScore / totalWeight) * 100
    : 0

  // Convert to letter grade
  const letterGrade = numericToLetterGrade(numericGrade)
  const gpaPoints = letterGradeToGPA(letterGrade)

  // Get course credit hours (default to 3 if not specified)
  const { data: course } = await supabase
    .from('courses')
    .select('credit_hours')
    .eq('id', courseId)
    .single()

  const creditHours = course?.credit_hours ?? 3
  const qualityPoints = gpaPoints * creditHours

  // Upsert course grade
  const { data: courseGrade, error: upsertError } = await supabase
    .from('course_grades')
    .upsert(
      {
        student_id: studentId,
        course_id: courseId,
        grading_period_id: gradingPeriodId,
        numeric_grade: Math.round(numericGrade * 100) / 100,
        letter_grade: letterGrade,
        gpa_points: gpaPoints,
        credit_hours: creditHours,
        quality_points: qualityPoints,
        status: 'calculated' as const,
        is_released: false,
      },
      {
        onConflict: 'student_id,course_id,grading_period_id',
      }
    )
    .select()
    .single()

  if (upsertError) {
    console.error('Error upserting course grade:', upsertError)
    return null
  }

  return courseGrade as CourseGrade
}

/**
 * Release grades for all students in a course for a grading period
 */
export async function releaseGrades(
  courseId: string,
  gradingPeriodId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('course_grades')
    .update({
      is_released: true,
      status: 'released',
    })
    .eq('course_id', courseId)
    .eq('grading_period_id', gradingPeriodId)

  if (error) {
    console.error('Error releasing grades:', error)
    return false
  }

  return true
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify teacher has access to a course
 */
async function verifyTeacherCourseAccess(
  teacherId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('course_id', courseId)

  if (error) {
    console.error('Error verifying teacher access:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Convert numeric grade to letter grade
 */
function numericToLetterGrade(numericGrade: number): string {
  if (numericGrade >= 97) return 'A+'
  if (numericGrade >= 93) return 'A'
  if (numericGrade >= 90) return 'A-'
  if (numericGrade >= 87) return 'B+'
  if (numericGrade >= 83) return 'B'
  if (numericGrade >= 80) return 'B-'
  if (numericGrade >= 77) return 'C+'
  if (numericGrade >= 73) return 'C'
  if (numericGrade >= 70) return 'C-'
  if (numericGrade >= 67) return 'D+'
  if (numericGrade >= 63) return 'D'
  if (numericGrade >= 60) return 'D-'
  return 'F'
}

/**
 * Convert letter grade to GPA points
 */
function letterGradeToGPA(letterGrade: string): number {
  const gpaMap: { [key: string]: number } = {
    'A+': 4.0,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'D-': 0.7,
    'F': 0.0,
  }

  return gpaMap[letterGrade] ?? 0.0
}
