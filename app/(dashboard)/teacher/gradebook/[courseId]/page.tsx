export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getGradebookData, getGradingPeriods, getCurrentGradingPeriod } from '@/lib/dal/teacher/gradebook'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getClassQuarterlyGrades } from '@/lib/dal/deped-grades'
import { createServiceClient } from '@/lib/supabase/service'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import GradebookClient from '@/components/teacher/gradebook/GradebookClient'
import type { GradebookRow, AssessmentScore } from '@/lib/dal/types/gradebook'

export const metadata = {
  title: 'Course Gradebook | Teacher Portal',
  description: 'Manage grades for your course'
}

interface PageProps {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ period?: string }>
}

// Helper to serialize Map to plain object for client component
function serializeGradebookRows(rows: GradebookRow[]): Array<{
  student: {
    student_id: string
    student_name: string
    lrn?: string
    profile_id: string
  }
  assessmentScores: Record<string, AssessmentScore>
  courseGrade?: {
    numeric_grade?: number
    letter_grade?: string
    attendance_count?: number
    total_class_days?: number
    behavior_score?: number
  }
}> {
  return rows.map(row => ({
    ...row,
    assessmentScores: Object.fromEntries(row.assessmentScores),
    courseGrade: row.courseGrade ? {
      numeric_grade: row.courseGrade.numeric_grade,
      letter_grade: row.courseGrade.letter_grade,
      attendance_count: row.courseGrade.attendance_count,
      total_class_days: row.courseGrade.total_class_days,
      behavior_score: row.courseGrade.behavior_score,
    } : undefined,
  }))
}

async function GradebookContent({
  courseId,
  periodId
}: {
  courseId: string
  periodId?: string
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'teacher') {
    redirect('/login')
  }

  // Get teacher profile (uses current authenticated user)
  const teacherProfile = await getTeacherProfile()
  if (!teacherProfile) {
    redirect('/login')
  }

  // Get all grading periods for the school
  const gradingPeriods = await getGradingPeriods(teacherProfile.school_id)

  // Get current/selected grading period
  let currentPeriod = periodId
    ? gradingPeriods.find(p => p.id === periodId) || null
    : await getCurrentGradingPeriod(teacherProfile.school_id)

  if (!currentPeriod && gradingPeriods.length > 0) {
    currentPeriod = gradingPeriods[0]
  }

  if (!currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-600 dark:text-slate-400">No grading periods configured.</p>
      </div>
    )
  }

  // Get gradebook data
  const gradebookData = await getGradebookData(
    teacherProfile.id,
    courseId,
    currentPeriod.id
  )

  if (!gradebookData) {
    notFound()
  }

  // Get course subject_type
  const supabase = createServiceClient()
  const { data: course } = await supabase
    .from('courses')
    .select('subject_type')
    .eq('id', courseId)
    .single()

  // Auto-sync attendance: read teacher_daily_attendance and merge into rows
  // so the gradebook always reflects the latest recorded attendance
  try {
    // Find the section linked to this course for this teacher
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      .select('section_id')
      .eq('course_id', courseId)
      .eq('teacher_profile_id', teacherProfile.id)
      .limit(1)
      .single()

    if (assignment?.section_id) {
      // Fetch all attendance records in the grading period date range
      const { data: attendanceRecords } = await supabase
        .from('teacher_daily_attendance')
        .select('student_id, date, status')
        .in('student_id', gradebookData.rows.map(r => r.student.student_id))
        .gte('date', currentPeriod.start_date)
        .lte('date', currentPeriod.end_date)

      if (attendanceRecords && attendanceRecords.length > 0) {
        // total_class_days = distinct dates any record exists
        const allDates = new Set(attendanceRecords.map((r: { date: string }) => r.date))
        const totalClassDays = allDates.size

        // per-student: count present + late
        const attendedMap: Record<string, number> = {}
        for (const rec of attendanceRecords as { student_id: string; date: string; status: string }[]) {
          if (rec.status === 'present' || rec.status === 'late') {
            attendedMap[rec.student_id] = (attendedMap[rec.student_id] ?? 0) + 1
          }
        }

        // Merge into gradebook rows
        gradebookData.rows = gradebookData.rows.map(row => {
          const attended = attendedMap[row.student.student_id] ?? row.courseGrade?.attendance_count ?? 0
          const savedTotal = row.courseGrade?.total_class_days ?? 0
          // Use computed total if it's larger than what's stored (attendance was recorded but not yet synced)
          const total = Math.max(totalClassDays, savedTotal)
          return {
            ...row,
            courseGrade: {
              ...row.courseGrade,
              attendance_count: attended,
              total_class_days: total,
            },
          }
        })
      }
    }
  } catch {
    // Non-fatal: if attendance sync fails, rows still load with stored values
  }

  // Get DepEd quarterly grades for the current period
  const depedReport = await getClassQuarterlyGrades(courseId, currentPeriod.id)

  // Serialize the gradebook data for client component (Maps to objects)
  const serializedData = {
    ...gradebookData,
    rows: serializeGradebookRows(gradebookData.rows),
    subject_type: (course?.subject_type ?? 'academic') as 'academic' | 'mapeh' | 'tle',
    school_id: teacherProfile.school_id,
    depedRows: (depedReport?.students ?? []).map((s) => ({
      student_id:          s.student_id,
      student_name:        s.student_name,
      lrn:                 s.lrn,
      ww_total_score:      s.breakdown?.ww.totalScore ?? null,
      ww_highest_score:    s.breakdown?.ww.highestPossibleScore ?? null,
      ww_percentage_score: s.breakdown?.ww.percentageScore ?? null,
      ww_weighted_score:   s.breakdown?.ww.weightedScore ?? null,
      pt_total_score:      s.breakdown?.pt.totalScore ?? null,
      pt_highest_score:    s.breakdown?.pt.highestPossibleScore ?? null,
      pt_percentage_score: s.breakdown?.pt.percentageScore ?? null,
      pt_weighted_score:   s.breakdown?.pt.weightedScore ?? null,
      qa_total_score:      s.breakdown?.qa.totalScore ?? null,
      qa_highest_score:    s.breakdown?.qa.highestPossibleScore ?? null,
      qa_percentage_score: s.breakdown?.qa.percentageScore ?? null,
      qa_weighted_score:   s.breakdown?.qa.weightedScore ?? null,
      initial_grade:       s.breakdown?.initialGrade ?? null,
      transmuted_grade:    s.breakdown?.transmutedGrade ?? null,
      quarterly_grade:     s.quarterly_grade,
      attendance_bonus:    s.attendance_bonus ?? null,
      is_locked:           s.is_locked,
      is_released:         s.is_released,
    })),
  }

  return (
    <GradebookClient
      gradebookData={serializedData}
      gradingPeriods={gradingPeriods}
      currentPeriodId={currentPeriod.id}
      teacherId={teacherProfile.id}
    />
  )
}

export default async function CourseGradebookPage({ params, searchParams }: PageProps) {
  const { courseId } = await params
  const { period } = await searchParams

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101822]">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <GradebookContent courseId={courseId} periodId={period} />
      </Suspense>
    </div>
  )
}
