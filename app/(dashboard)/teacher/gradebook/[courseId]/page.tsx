import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getGradebookData, getGradingPeriods, getCurrentGradingPeriod } from '@/lib/dal/teacher/gradebook'
import { getTeacherProfile } from '@/lib/dal/teacher'
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
  }
}> {
  return rows.map(row => ({
    ...row,
    assessmentScores: Object.fromEntries(row.assessmentScores)
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

  // Serialize the gradebook data for client component (Maps to objects)
  const serializedData = {
    ...gradebookData,
    rows: serializeGradebookRows(gradebookData.rows)
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
