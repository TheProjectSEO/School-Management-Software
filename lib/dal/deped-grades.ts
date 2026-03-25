/**
 * DepEd Grading Data Access Layer
 *
 * Handles all database operations for the DepEd K-12 grading system:
 *   - Quarterly grade computation and storage
 *   - Final grade computation (avg of 4 quarters)
 *   - General average computation
 *   - Honors determination
 *   - Admin override with audit log
 */

import { createServiceClient } from '@/lib/supabase/service'
import {
  computeQuarterGrade,
  computeFinalGrade,
  computeGeneralAverage,
  checkHonors,
  type DepEdSubjectType,
  type TransmutationMethod,
  type QuarterGradeBreakdown,
} from '@/lib/grading/deped-engine'

// ============================================================================
// Types
// ============================================================================

export interface DepEdQuarterlyGrade {
  id: string
  student_id: string
  course_id: string
  course_name: string
  grading_period_id: string
  grading_period_name: string
  subject_type: DepEdSubjectType
  // WW
  ww_total_score: number | null
  ww_highest_score: number | null
  ww_percentage_score: number | null
  ww_weighted_score: number | null
  // PT
  pt_total_score: number | null
  pt_highest_score: number | null
  pt_percentage_score: number | null
  pt_weighted_score: number | null
  // QA
  qa_total_score: number | null
  qa_highest_score: number | null
  qa_percentage_score: number | null
  qa_weighted_score: number | null
  // Final
  initial_grade: number | null
  transmuted_grade: number | null
  quarterly_grade: number | null
  is_locked: boolean
  is_released: boolean
  status: string
}

export interface DepEdFinalGrade {
  id: string
  student_id: string
  course_id: string
  course_name: string
  academic_year: string
  q1_grade: number | null
  q2_grade: number | null
  q3_grade: number | null
  q4_grade: number | null
  final_grade: number | null
  is_released: boolean
}

export interface DepEdStudentReport {
  student_id: string
  student_name: string
  lrn: string
  academic_year: string
  final_grades: DepEdFinalGrade[]
  general_average: number | null
  general_average_rounded: number | null
  honors_status: string | null
  lowest_subject_grade: number | null
}

export interface ClassQuarterlyReport {
  course_id: string
  course_name: string
  grading_period_id: string
  grading_period_name: string
  students: Array<{
    student_id: string
    student_name: string
    lrn: string
    breakdown: QuarterGradeBreakdown | null
    quarterly_grade: number | null
    attendance_bonus: number | null
    is_locked: boolean
    is_released: boolean
  }>
}

// ============================================================================
// Transmutation config helper
// ============================================================================

async function getTransmutationMethod(schoolId: string): Promise<TransmutationMethod> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('deped_transmutation_config')
    .select('method')
    .eq('school_id', schoolId)
    .maybeSingle()
  return (data?.method as TransmutationMethod) ?? 'table'
}

// ============================================================================
// Quarterly Grade Computation
// ============================================================================

/**
 * Compute and save quarterly grade for a single student in a course.
 *
 * Groups submissions by deped_component (written_work / performance_task /
 * quarterly_assessment), runs the DepEd engine, and upserts into course_grades.
 */
export async function computeAndSaveQuarterlyGrade(
  studentId: string,
  courseId: string,
  gradingPeriodId: string,
  computedBy: string,
  schoolId: string
): Promise<{ success: boolean; breakdown?: QuarterGradeBreakdown; error?: string }> {
  const supabase = createServiceClient()

  try {
    // Check if grade is locked
    const { data: existing } = await supabase
      .from('course_grades')
      .select('is_locked')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('grading_period_id', gradingPeriodId)
      .maybeSingle()

    if (existing?.is_locked) {
      return { success: false, error: 'Grade is locked. Use admin override to change.' }
    }

    // Get course subject_type
    const { data: course } = await supabase
      .from('courses')
      .select('subject_type')
      .eq('id', courseId)
      .single()

    const VALID_SUBJECT_TYPES: DepEdSubjectType[] = ['academic', 'mapeh', 'tle']
    const rawSubjectType = course?.subject_type ?? 'academic'
    const subjectType: DepEdSubjectType = VALID_SUBJECT_TYPES.includes(rawSubjectType as DepEdSubjectType)
      ? (rawSubjectType as DepEdSubjectType)
      : 'academic'

    // Get transmutation method for this school
    const method = await getTransmutationMethod(schoolId)

    // Fetch all assessments for this course in this grading period
    // (filtered by grading_period_id)
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, deped_component, total_points')
      .eq('course_id', courseId)
      .eq('grading_period_id', gradingPeriodId)
      .not('deped_component', 'is', null)

    if (!assessments || assessments.length === 0) {
      return { success: false, error: 'No assessments with DepEd components found for this period.' }
    }

    const assessmentIds = assessments.map((a) => a.id)

    // Fetch student's graded submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('assessment_id, score')
      .eq('student_id', studentId)
      .in('assessment_id', assessmentIds)
      .in('status', ['graded', 'released'])

    const submissionMap = new Map<string, number>(
      (submissions ?? []).map((s) => [s.assessment_id, s.score ?? 0])
    )

    // Aggregate scores per component
    const componentTotals: Record<string, { totalScore: number; highestPossibleScore: number }> = {
      written_work:        { totalScore: 0, highestPossibleScore: 0 },
      performance_task:    { totalScore: 0, highestPossibleScore: 0 },
      quarterly_assessment:{ totalScore: 0, highestPossibleScore: 0 },
    }

    for (const assessment of assessments) {
      const component = assessment.deped_component
      if (!component || !componentTotals[component]) continue

      const highestPossible = assessment.total_points ?? 0
      if (highestPossible <= 0) continue

      const rawScore = submissionMap.get(assessment.id) ?? 0
      const clampedScore = Math.max(0, Math.min(highestPossible, rawScore))
      componentTotals[component].totalScore += clampedScore
      componentTotals[component].highestPossibleScore += highestPossible
    }

    // Run DepEd computation engine
    const breakdown = computeQuarterGrade(
      componentTotals.written_work,
      componentTotals.performance_task,
      componentTotals.quarterly_assessment,
      subjectType,
      method
    )

    // Compute attendance bonus (0–10 pts) based on attendance rate in the grading period
    let attendanceBonus = 0
    const { data: period } = await supabase
      .from('grading_periods')
      .select('start_date, end_date')
      .eq('id', gradingPeriodId)
      .maybeSingle()

    if (period?.start_date && period?.end_date) {
      const { data: attendanceRecords } = await supabase
        .from('teacher_daily_attendance')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', period.start_date)
        .lte('date', period.end_date)

      const records = attendanceRecords ?? []
      if (records.length > 0) {
        const present = records.filter((r) => r.status === 'present' || r.status === 'late').length
        const attendanceRate = (present / records.length) * 100
        // Linear scale: 90% → 0 pts, 95% → 5 pts, 100% → 10 pts. Below 90% → 0.
        attendanceBonus = Math.round(Math.max(0, attendanceRate - 90))
      }
    }

    const finalQuarterlyGrade = Math.min(100, breakdown.quarterlyGrade + attendanceBonus)

    // Upsert into course_grades
    const { error: upsertError } = await supabase
      .from('course_grades')
      .upsert(
        {
          student_id:          studentId,
          course_id:           courseId,
          grading_period_id:   gradingPeriodId,
          school_id:           schoolId,
          // WW
          ww_total_score:      breakdown.ww.totalScore,
          ww_highest_score:    breakdown.ww.highestPossibleScore,
          ww_percentage_score: breakdown.ww.percentageScore,
          ww_weighted_score:   breakdown.ww.weightedScore,
          // PT
          pt_total_score:      breakdown.pt.totalScore,
          pt_highest_score:    breakdown.pt.highestPossibleScore,
          pt_percentage_score: breakdown.pt.percentageScore,
          pt_weighted_score:   breakdown.pt.weightedScore,
          // QA
          qa_total_score:      breakdown.qa.totalScore,
          qa_highest_score:    breakdown.qa.highestPossibleScore,
          qa_percentage_score: breakdown.qa.percentageScore,
          qa_weighted_score:   breakdown.qa.weightedScore,
          // Computed grades
          initial_grade:       breakdown.initialGrade,
          transmuted_grade:    breakdown.transmutedGrade,
          quarterly_grade:     finalQuarterlyGrade,
          numeric_grade:       finalQuarterlyGrade, // keep numeric_grade in sync
          attendance_bonus:    attendanceBonus,
          // Status
          status:        'calculated',
          is_released:   false,
          updated_at:    new Date().toISOString(),
        },
        { onConflict: 'student_id,course_id,grading_period_id' }
      )

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    return { success: true, breakdown }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Compute quarterly grades for ALL students in a course for a grading period.
 */
export async function computeClassQuarterlyGrades(
  courseId: string,
  gradingPeriodId: string,
  computedBy: string,
  schoolId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = createServiceClient()

  // Get all students: enrollments + BUG-002 section fallback
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active')

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.student_id))

  // BUG-002 fallback: students in sections assigned to this course
  const { data: sectionAssignments } = await supabase
    .from('teacher_assignments')
    .select('section_id')
    .eq('course_id', courseId)
    .not('section_id', 'is', null)

  const sectionIds = [...new Set(
    (sectionAssignments ?? []).map((a) => a.section_id).filter(Boolean)
  )]

  if (sectionIds.length > 0) {
    const { data: sectionStudents } = await supabase
      .from('students')
      .select('id')
      .in('section_id', sectionIds)
    ;(sectionStudents ?? []).forEach((s) => enrolledIds.add(s.id))
  }

  const allStudentIds = Array.from(enrolledIds)

  if (allStudentIds.length === 0) {
    return { success: 0, failed: 0, errors: ['No active enrollments found'] }
  }

  const results = await Promise.allSettled(
    allStudentIds.map((sid) =>
      computeAndSaveQuarterlyGrade(sid, courseId, gradingPeriodId, computedBy, schoolId)
    )
  )

  let success = 0
  let failed = 0
  const errors: string[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.success) {
      success++
    } else {
      failed++
      const error = result.status === 'rejected'
        ? String(result.reason)
        : result.value.error ?? 'Unknown error'
      errors.push(`Student ${allStudentIds[i]}: ${error}`)
    }
  })

  return { success, failed, errors }
}


/**
 * Get quarterly grade breakdown for all students in a class.
 */
export async function getClassQuarterlyGrades(
  courseId: string,
  gradingPeriodId: string
): Promise<ClassQuarterlyReport | null> {
  const supabase = createServiceClient()

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', courseId)
    .single()

  if (!course) return null

  // Get grading period info
  const { data: period } = await supabase
    .from('grading_periods')
    .select('id, name')
    .eq('id', gradingPeriodId)
    .single()

  if (!period) return null

  // Get enrolled students + BUG-002 section fallback
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active')

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.student_id))

  // BUG-002 fallback: students in sections assigned to this course
  const { data: sectionAssignments } = await supabase
    .from('teacher_assignments')
    .select('section_id')
    .eq('course_id', courseId)
    .not('section_id', 'is', null)

  const sectionIds = [...new Set(
    (sectionAssignments ?? []).map((a) => a.section_id).filter(Boolean)
  )]

  if (sectionIds.length > 0) {
    const { data: sectionStudents } = await supabase
      .from('students')
      .select('id')
      .in('section_id', sectionIds)
    ;(sectionStudents ?? []).forEach((s) => enrolledIds.add(s.id))
  }

  if (enrolledIds.size === 0) return null

  const studentIds = Array.from(enrolledIds)

  // Get student profiles
  const { data: students } = await supabase
    .from('students')
    .select('id, lrn, profile_id')
    .in('id', studentIds)

  const profileIds = (students ?? []).map((s) => s.profile_id).filter(Boolean)
  const { data: profiles } = await supabase
    .from('school_profiles')
    .select('id, full_name')
    .in('id', profileIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const studentMap = new Map(
    (students ?? []).map((s) => ({
      id: s.id,
      lrn: s.lrn ?? '',
      name: profileMap.get(s.profile_id) ?? 'Unknown',
    })).map((s) => [s.id, s])
  )

  // Get computed grades
  const { data: grades } = await supabase
    .from('course_grades')
    .select(`
      student_id,
      ww_total_score, ww_highest_score, ww_percentage_score, ww_weighted_score,
      pt_total_score, pt_highest_score, pt_percentage_score, pt_weighted_score,
      qa_total_score, qa_highest_score, qa_percentage_score, qa_weighted_score,
      initial_grade, transmuted_grade, quarterly_grade,
      attendance_bonus, is_locked, is_released
    `)
    .eq('course_id', courseId)
    .eq('grading_period_id', gradingPeriodId)
    .in('student_id', studentIds)

  const gradeMap = new Map((grades ?? []).map((g) => [g.student_id, g]))

  const rows = studentIds.map((studentId) => {
    const student = studentMap.get(studentId)
    const grade = gradeMap.get(studentId)

    let breakdown: QuarterGradeBreakdown | null = null
    if (grade?.quarterly_grade !== null && grade?.quarterly_grade !== undefined) {
      breakdown = {
        ww: {
          totalScore:          grade.ww_total_score ?? 0,
          highestPossibleScore: grade.ww_highest_score ?? 0,
          percentageScore:     grade.ww_percentage_score ?? 0,
          weightedScore:       grade.ww_weighted_score ?? 0,
        },
        pt: {
          totalScore:          grade.pt_total_score ?? 0,
          highestPossibleScore: grade.pt_highest_score ?? 0,
          percentageScore:     grade.pt_percentage_score ?? 0,
          weightedScore:       grade.pt_weighted_score ?? 0,
        },
        qa: {
          totalScore:          grade.qa_total_score ?? 0,
          highestPossibleScore: grade.qa_highest_score ?? 0,
          percentageScore:     grade.qa_percentage_score ?? 0,
          weightedScore:       grade.qa_weighted_score ?? 0,
        },
        initialGrade:    grade.initial_grade ?? 0,
        transmutedGrade: grade.transmuted_grade ?? 0,
        quarterlyGrade:  grade.quarterly_grade ?? 0,
      }
    }

    return {
      student_id:      studentId,
      student_name:    student?.name ?? 'Unknown',
      lrn:             student?.lrn ?? '',
      breakdown,
      quarterly_grade: grade?.quarterly_grade ?? null,
      attendance_bonus: grade?.attendance_bonus ?? null,
      is_locked:       grade?.is_locked ?? false,
      is_released:     grade?.is_released ?? false,
    }
  })

  return {
    course_id:           course.id,
    course_name:         course.name,
    grading_period_id:   period.id,
    grading_period_name: period.name,
    students:            rows,
  }
}

/**
 * Release quarterly grades for all students in a course/period.
 */
export async function releaseQuarterlyGrades(
  courseId: string,
  gradingPeriodId: string,
  releasedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('course_grades')
    .update({
      is_released: true,
      status: 'released',
      updated_at: new Date().toISOString(),
    })
    .eq('course_id', courseId)
    .eq('grading_period_id', gradingPeriodId)
    .eq('is_locked', false)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ============================================================================
// Final Grade (end-of-year)
// ============================================================================

/**
 * Compute and save Final Grade for a student in a course.
 * Averages Q1+Q2+Q3+Q4 quarterly grades from course_grades table.
 *
 * Grading periods must be named consistently and ordered by period_number.
 */
export async function computeAndSaveFinalGrade(
  studentId: string,
  courseId: string,
  academicYear: string,
  schoolId: string,
  computedBy: string
): Promise<{ success: boolean; finalGrade?: number | null; error?: string }> {
  const supabase = createServiceClient()

  try {
    // Get all grading periods for this academic year ordered by period_number
    const { data: periods } = await supabase
      .from('grading_periods')
      .select('id, period_number')
      .eq('school_id', schoolId)
      .eq('academic_year', academicYear)
      .eq('period_type', 'quarter')
      .order('period_number', { ascending: true })

    if (!periods || periods.length === 0) {
      return { success: false, error: 'No quarterly grading periods found for this academic year.' }
    }

    // Get quarterly grades for each period
    const periodIds = periods.map((p) => p.id)
    const { data: quarterlyGrades } = await supabase
      .from('course_grades')
      .select('grading_period_id, quarterly_grade')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('grading_period_id', periodIds)

    const gradeByPeriod = new Map(
      (quarterlyGrades ?? []).map((g) => [g.grading_period_id, g.quarterly_grade])
    )

    // Map to Q1-Q4 by period_number
    const q1 = gradeByPeriod.get(periods.find((p) => p.period_number === 1)?.id ?? '') ?? null
    const q2 = gradeByPeriod.get(periods.find((p) => p.period_number === 2)?.id ?? '') ?? null
    const q3 = gradeByPeriod.get(periods.find((p) => p.period_number === 3)?.id ?? '') ?? null
    const q4 = gradeByPeriod.get(periods.find((p) => p.period_number === 4)?.id ?? '') ?? null

    const finalGrade = computeFinalGrade(q1, q2, q3, q4)

    const { error } = await supabase
      .from('deped_final_grades')
      .upsert(
        {
          student_id:    studentId,
          course_id:     courseId,
          academic_year: academicYear,
          school_id:     schoolId,
          q1_grade:      q1,
          q2_grade:      q2,
          q3_grade:      q3,
          q4_grade:      q4,
          final_grade:   finalGrade,
          is_released:   false,
          computed_at:   new Date().toISOString(),
          computed_by:   computedBy,
          updated_at:    new Date().toISOString(),
        },
        { onConflict: 'student_id,course_id,academic_year' }
      )

    if (error) return { success: false, error: error.message }
    return { success: true, finalGrade }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Compute final grades for all students in a course for an academic year.
 */
export async function computeClassFinalGrades(
  courseId: string,
  academicYear: string,
  schoolId: string,
  computedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = createServiceClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active')

  if (!enrollments?.length) {
    return { success: 0, failed: 0, errors: ['No active enrollments'] }
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const enrollment of enrollments) {
    const result = await computeAndSaveFinalGrade(
      enrollment.student_id, courseId, academicYear, schoolId, computedBy
    )
    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`${enrollment.student_id}: ${result.error}`)
    }
  }

  return { success, failed, errors }
}

// ============================================================================
// General Average & Honors
// ============================================================================

/**
 * Compute and save General Average + Honors for a student.
 * Uses all deped_final_grades for the academic year.
 */
export async function computeAndSaveGeneralAverage(
  studentId: string,
  academicYear: string,
  schoolId: string,
  computedBy: string
): Promise<{ success: boolean; generalAverage?: number | null; honorsStatus?: string | null; error?: string }> {
  const supabase = createServiceClient()

  try {
    // Get all final grades for this student/year
    const { data: finalGrades } = await supabase
      .from('deped_final_grades')
      .select('course_id, final_grade')
      .eq('student_id', studentId)
      .eq('academic_year', academicYear)
      .eq('school_id', schoolId)

    if (!finalGrades?.length) {
      return { success: false, error: 'No final grades found for this student and academic year.' }
    }

    const validGrades = finalGrades.filter((g) => g.final_grade !== null)
    if (validGrades.length === 0) {
      return { success: false, error: 'No completed final grades found.' }
    }

    // Get course names for the snapshot
    const courseIds = validGrades.map((g) => g.course_id)
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', courseIds)

    const courseNameMap = new Map((courses ?? []).map((c) => [c.id, c.name]))

    const numericGrades = validGrades.map((g) => g.final_grade as number)
    const generalAverage = computeGeneralAverage(numericGrades)
    const honorsResult = generalAverage !== null
      ? checkHonors(generalAverage, numericGrades)
      : { status: null, qualifies: false }

    const subjectGradesJson = validGrades.map((g) => ({
      course_id:   g.course_id,
      course_name: courseNameMap.get(g.course_id) ?? 'Unknown',
      final_grade: g.final_grade,
    }))

    const { error } = await supabase
      .from('deped_general_average')
      .upsert(
        {
          student_id:               studentId,
          academic_year:            academicYear,
          school_id:                schoolId,
          is_released:              false,
          general_average:          generalAverage,
          general_average_rounded:  generalAverage !== null ? Math.round(generalAverage) : null,
          honors_status:            honorsResult.status,
          subject_grades_json:      subjectGradesJson,
          lowest_subject_grade:     Math.min(...numericGrades),
          computed_at:              new Date().toISOString(),
          computed_by:              computedBy,
          updated_at:               new Date().toISOString(),
        },
        { onConflict: 'student_id,academic_year' }
      )

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      generalAverage,
      honorsStatus: honorsResult.status,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Compute General Average for all students in a school for an academic year.
 */
export async function computeSchoolGeneralAverages(
  schoolId: string,
  academicYear: string,
  computedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = createServiceClient()

  // Get all students in this school who have final grades this year
  const { data: rows } = await supabase
    .from('deped_final_grades')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('academic_year', academicYear)

  const studentIds = [...new Set((rows ?? []).map((r) => r.student_id))]

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const studentId of studentIds) {
    const result = await computeAndSaveGeneralAverage(studentId, academicYear, schoolId, computedBy)
    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`${studentId}: ${result.error}`)
    }
  }

  return { success, failed, errors }
}

// ============================================================================
// Student-facing grade view
// ============================================================================

/**
 * Get released DepEd grades for a student (used in student dashboard).
 */
export async function getStudentDepEdGrades(
  studentId: string,
  academicYear?: string
): Promise<DepEdStudentReport | null> {
  const supabase = createServiceClient()

  // Get student info
  const { data: student } = await supabase
    .from('students')
    .select('id, lrn, profile_id')
    .eq('id', studentId)
    .single()

  if (!student) return null

  const { data: profile } = await supabase
    .from('school_profiles')
    .select('full_name')
    .eq('id', student.profile_id)
    .single()

  // Determine academic year
  let targetYear = academicYear
  if (!targetYear) {
    const { data: latestGA } = await supabase
      .from('deped_general_average')
      .select('academic_year')
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false })
      .limit(1)
      .maybeSingle()

    targetYear = latestGA?.academic_year
  }

  if (!targetYear) return null

  // Get final grades (released only)
  const { data: finalGrades } = await supabase
    .from('deped_final_grades')
    .select('id, student_id, course_id, academic_year, q1_grade, q2_grade, q3_grade, q4_grade, final_grade, is_released')
    .eq('student_id', studentId)
    .eq('academic_year', targetYear)
    .eq('is_released', true)

  const courseIds = (finalGrades ?? []).map((g) => g.course_id)
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .in('id', courseIds)

  const courseNameMap = new Map((courses ?? []).map((c) => [c.id, c.name]))

  const mappedFinalGrades: DepEdFinalGrade[] = (finalGrades ?? []).map((g) => ({
    id:           g.id,
    student_id:   g.student_id,
    course_id:    g.course_id,
    course_name:  courseNameMap.get(g.course_id) ?? 'Unknown',
    academic_year: g.academic_year,
    q1_grade:     g.q1_grade,
    q2_grade:     g.q2_grade,
    q3_grade:     g.q3_grade,
    q4_grade:     g.q4_grade,
    final_grade:  g.final_grade,
    is_released:  g.is_released,
  }))

  // Get general average (released only)
  const { data: ga } = await supabase
    .from('deped_general_average')
    .select('general_average, general_average_rounded, honors_status, lowest_subject_grade')
    .eq('student_id', studentId)
    .eq('academic_year', targetYear)
    .eq('is_released', true)
    .maybeSingle()

  return {
    student_id:              studentId,
    student_name:            profile?.full_name ?? 'Unknown',
    lrn:                     student.lrn ?? '',
    academic_year:           targetYear,
    final_grades:            mappedFinalGrades,
    general_average:         ga?.general_average ?? null,
    general_average_rounded: ga?.general_average_rounded ?? null,
    honors_status:           ga?.honors_status ?? null,
    lowest_subject_grade:    ga?.lowest_subject_grade ?? null,
  }
}

// ============================================================================
// Admin: honors list
// ============================================================================

export interface HonorsListEntry {
  student_id: string
  student_name: string
  lrn: string
  section_name: string
  general_average: number
  honors_status: string
  subject_grades: Array<{ course_name: string; final_grade: number }>
}

export async function getHonorsList(
  schoolId: string,
  academicYear: string
): Promise<HonorsListEntry[]> {
  const supabase = createServiceClient()

  const { data: rows } = await supabase
    .from('deped_general_average')
    .select('student_id, general_average_rounded, honors_status, subject_grades_json')
    .eq('school_id', schoolId)
    .eq('academic_year', academicYear)
    .eq('is_released', true)
    .not('honors_status', 'is', null)
    .order('general_average_rounded', { ascending: false })

  if (!rows?.length) return []

  const studentIds = rows.map((r) => r.student_id)
  const { data: students } = await supabase
    .from('students')
    .select('id, lrn, profile_id, section_id')
    .in('id', studentIds)

  const profileIds = (students ?? []).map((s) => s.profile_id).filter(Boolean)
  const sectionIds = (students ?? []).map((s) => s.section_id).filter(Boolean)

  const [{ data: profiles }, { data: sections }] = await Promise.all([
    supabase.from('school_profiles').select('id, full_name').in('id', profileIds),
    supabase.from('sections').select('id, name').in('id', sectionIds),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const sectionMap = new Map((sections ?? []).map((s) => [s.id, s.name]))
  const studentMap = new Map((students ?? []).map((s) => [s.id, s]))

  return rows.map((row) => {
    const student = studentMap.get(row.student_id)
    return {
      student_id:      row.student_id,
      student_name:    profileMap.get(student?.profile_id ?? '') ?? 'Unknown',
      lrn:             student?.lrn ?? '',
      section_name:    sectionMap.get(student?.section_id ?? '') ?? '',
      general_average: row.general_average_rounded ?? 0,
      honors_status:   row.honors_status ?? '',
      subject_grades:  (row.subject_grades_json as Array<{ course_name: string; final_grade: number }>) ?? [],
    }
  })
}

// ============================================================================
// Admin override with audit log
// ============================================================================

export async function adminOverrideQuarterlyGrade(
  studentId: string,
  courseId: string,
  gradingPeriodId: string,
  newQuarterlyGrade: number,
  performedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Get current value for audit
  const { data: current } = await supabase
    .from('course_grades')
    .select('quarterly_grade, initial_grade, transmuted_grade')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .eq('grading_period_id', gradingPeriodId)
    .maybeSingle()

  const { data: updated, error } = await supabase
    .from('course_grades')
    .upsert(
      {
        student_id:        studentId,
        course_id:         courseId,
        grading_period_id: gradingPeriodId,
        quarterly_grade:   newQuarterlyGrade,
        numeric_grade:     newQuarterlyGrade,
        status:            'calculated',
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'student_id,course_id,grading_period_id' }
    )
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Log override
  await supabase.from('deped_grade_audit_log').insert({
    grade_type:      'quarterly',
    grade_id:        updated?.id,
    action:          'override',
    previous_value:  current ?? null,
    new_value:       { quarterly_grade: newQuarterlyGrade },
    performed_by:    performedBy,
    performed_at:    new Date().toISOString(),
    reason,
  })

  return { success: true }
}

// ============================================================================
// Release general averages
// ============================================================================

/**
 * Release all computed general averages for a school and academic year.
 * Filters by student_ids derived from deped_final_grades (to scope to this school).
 */
export async function releaseGeneralAverages(
  schoolId: string,
  academicYear: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Get student IDs scoped to this school via deped_final_grades
  const { data: rows } = await supabase
    .from('deped_final_grades')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('academic_year', academicYear)

  const studentIds = [...new Set((rows ?? []).map((r: { student_id: string }) => r.student_id))]
  if (!studentIds.length) return { success: true }

  const { error } = await supabase
    .from('deped_general_average')
    .update({
      is_released: true,
      updated_at:  new Date().toISOString(),
    })
    .in('student_id', studentIds)
    .eq('academic_year', academicYear)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
