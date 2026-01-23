import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getGradebookData,
  getGradingPeriods,
  getCurrentGradingPeriod,
} from '@/lib/dal/teacher/gradebook'
import GradebookClient from '@/components/gradebook/GradebookClient'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const metadata = {
  title: 'Gradebook | MSU Teacher Portal',
  description: 'Manage student grades and assessments',
}

interface GradebookPageProps {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ period?: string }>
}

async function GradebookContent({
  courseId,
  periodId,
}: {
  courseId: string
  periodId?: string
}) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  // Get grading periods for this school
  const gradingPeriods = await getGradingPeriods(teacherProfile.school_id)

  // Get current grading period or use specified one
  let activePeriod = periodId
    ? gradingPeriods.find((p) => p.id === periodId) || null
    : await getCurrentGradingPeriod(teacherProfile.school_id)

  // Fallback to the first available period
  if (!activePeriod && gradingPeriods.length > 0) {
    activePeriod = gradingPeriods[0]
  }

  if (!activePeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          event_busy
        </span>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Grading Periods Found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          There are no grading periods configured for your school. Please contact your administrator.
        </p>
      </div>
    )
  }

  // Get gradebook data
  const gradebookData = await getGradebookData(
    teacherProfile.id,
    courseId,
    activePeriod.id
  )

  if (!gradebookData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          error_outline
        </span>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Unable to Load Gradebook
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          You may not have access to this course, or an error occurred while loading the data.
        </p>
      </div>
    )
  }

  // Serialize Map objects for client component
  const serializedRows = gradebookData.rows.map((row) => ({
    ...row,
    assessmentScores: Object.fromEntries(row.assessmentScores),
  }))

  return (
    <GradebookClient
      gradebookData={{
        ...gradebookData,
        rows: serializedRows,
      }}
      gradingPeriods={gradingPeriods}
      currentPeriodId={activePeriod.id}
      teacherId={teacherProfile.id}
    />
  )
}

export default async function GradebookPage({
  params,
  searchParams,
}: GradebookPageProps) {
  const { courseId } = await params
  const { period } = await searchParams

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <GradebookContent courseId={courseId} periodId={period} />
      </Suspense>
    </div>
  )
}
