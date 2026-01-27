/**
 * Gradebook Data Access Layer
 * Handles all database operations for the teacher gradebook
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface GradebookCourse {
  id: string
  name: string
  subject_code: string
  section_name: string
  section_id: string
}

export interface GradebookStudent {
  id: string
  profile_id: string
  full_name: string
  lrn: string
  avatar_url: string | null
}

export interface GradebookAssessment {
  id: string
  title: string
  type: string
  total_points: number
  due_date: string | null
  weight: number
  grading_period_id: string | null
}

export interface GradebookGrade {
  student_id: string
  assessment_id: string
  score: number | null
  status: 'pending' | 'graded' | 'released'
  submitted_at: string | null
}

export interface GradingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export interface GradebookData {
  course: GradebookCourse
  students: GradebookStudent[]
  assessments: GradebookAssessment[]
  grades: GradebookGrade[]
  gradingPeriods: GradingPeriod[]
  currentPeriod: GradingPeriod | null
}

// ============================================
// Functions
// ============================================

/**
 * Get gradebook data for a specific course
 */
export async function getCourseGradebook(
  courseId: string,
  teacherProfileId: string,
  periodId?: string
): Promise<GradebookData | null> {
  const supabase = await createClient()

  // Verify teacher has access to this course
  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('course_id', courseId)
    .eq('teacher_profile_id', teacherProfileId)
    .single()

  // Also check by looking up teacher_profiles first
  let hasAccess = !!assignment
  if (!hasAccess) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', teacherProfileId)
      .single()

    if (teacherProfile) {
      const { data: assignmentByProfile } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('course_id', courseId)
        .eq('teacher_profile_id', teacherProfile.id)
        .single()
      hasAccess = !!assignmentByProfile
    }
  }

  // Also allow if teacher is the course teacher
  if (!hasAccess) {
    const { data: courseData } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single()

    if (courseData?.teacher_id === teacherProfileId) {
      hasAccess = true
    }
  }

  if (!hasAccess) {
    return null
  }

  // Get course details
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      subject_code,
      sections:section_id (
        id,
        name
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) {
    return null
  }

  // Get grading periods
  const { data: periods } = await supabase
    .from('grading_periods')
    .select('id, name, start_date, end_date, is_current')
    .order('start_date', { ascending: true })

  const gradingPeriods = (periods || []).map(p => ({
    id: p.id,
    name: p.name,
    start_date: p.start_date,
    end_date: p.end_date,
    is_current: p.is_current || false
  }))

  const currentPeriod = gradingPeriods.find(p => p.is_current) || gradingPeriods[0] || null
  const activePeriodId = periodId || currentPeriod?.id

  // Get enrolled students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      student:student_id (
        id,
        profile_id,
        lrn,
        profiles:profile_id (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('course_id', courseId)

  const students: GradebookStudent[] = (enrollments || [])
    .filter(e => e.student)
    .map(e => {
      const student = e.student as any
      const profile = student.profiles as any
      return {
        id: student.id,
        profile_id: student.profile_id,
        full_name: profile?.full_name || 'Unknown',
        lrn: student.lrn || '',
        avatar_url: profile?.avatar_url || null
      }
    })

  // Get assessments for this course (optionally filtered by grading period)
  let assessmentQuery = supabase
    .from('assessments')
    .select('id, title, type, total_points, due_date, weight, grading_period_id')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (activePeriodId) {
    assessmentQuery = assessmentQuery.eq('grading_period_id', activePeriodId)
  }

  const { data: assessmentsData } = await assessmentQuery

  const assessments: GradebookAssessment[] = (assessmentsData || []).map(a => ({
    id: a.id,
    title: a.title,
    type: a.type || 'assignment',
    total_points: a.total_points || 100,
    due_date: a.due_date,
    weight: a.weight || 1,
    grading_period_id: a.grading_period_id
  }))

  // Get all submissions/grades for these assessments
  const assessmentIds = assessments.map(a => a.id)
  const studentIds = students.map(s => s.id)

  let grades: GradebookGrade[] = []
  if (assessmentIds.length > 0 && studentIds.length > 0) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, student_id, assessment_id, score, status, submitted_at')
      .in('assessment_id', assessmentIds)
      .in('student_id', studentIds)

    grades = (submissions || []).map(s => ({
      student_id: s.student_id,
      assessment_id: s.assessment_id,
      score: s.score,
      status: s.status || 'pending',
      submitted_at: s.submitted_at
    }))
  }

  const section = course.sections as any
  return {
    course: {
      id: course.id,
      name: course.name,
      subject_code: course.subject_code || '',
      section_name: section?.name || '',
      section_id: section?.id || ''
    },
    students,
    assessments,
    grades,
    gradingPeriods,
    currentPeriod
  }
}

/**
 * Save a grade for a student assessment
 */
export async function saveGrade(
  studentId: string,
  assessmentId: string,
  score: number,
  teacherProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Check if submission exists
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('student_id', studentId)
    .eq('assessment_id', assessmentId)
    .single()

  if (existing) {
    // Update existing submission
    const { error } = await supabase
      .from('submissions')
      .update({
        score,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: teacherProfileId
      })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Create new submission with grade
    const { error } = await supabase
      .from('submissions')
      .insert({
        student_id: studentId,
        assessment_id: assessmentId,
        score,
        status: 'graded',
        submitted_at: new Date().toISOString(),
        graded_at: new Date().toISOString(),
        graded_by: teacherProfileId
      })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

/**
 * Bulk save grades
 */
export async function bulkSaveGrades(
  grades: { studentId: string; assessmentId: string; score: number }[],
  teacherProfileId: string
): Promise<{ success: boolean; saved: number; errors: string[] }> {
  const results = await Promise.all(
    grades.map(g => saveGrade(g.studentId, g.assessmentId, g.score, teacherProfileId))
  )

  const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error')
  const saved = results.filter(r => r.success).length

  return {
    success: errors.length === 0,
    saved,
    errors
  }
}

/**
 * Release grades for an assessment
 */
export async function releaseGrades(
  assessmentId: string,
  teacherProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: teacherProfileId
    })
    .eq('assessment_id', assessmentId)
    .eq('status', 'graded')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
