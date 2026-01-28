import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import {
  getTeacherProfile,
  getTeacherLiveSessions,
  getUpcomingAssessmentDueDates,
  getTeacherSubjects
} from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CalendarClient from './CalendarClient'

export const metadata = {
  title: 'Calendar | MSU Teacher Portal',
  description: 'Manage your schedule and upcoming sessions'
}

async function CalendarContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  // Get date range for next 3 months
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)

  // Fetch data in parallel
  const [sessions, assessments, subjects] = await Promise.all([
    getTeacherLiveSessions(
      teacherProfile.id,
      startDate.toISOString(),
      endDate.toISOString()
    ),
    getUpcomingAssessmentDueDates(
      teacherProfile.id,
      startDate.toISOString(),
      endDate.toISOString()
    ),
    getTeacherSubjects(teacherProfile.id)
  ])

  return (
    <CalendarClient
      teacherId={teacherProfile.id}
      sessions={sessions}
      assessments={assessments}
      subjects={subjects}
    />
  )
}

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Calendar
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your schedule and upcoming sessions
        </p>
      </div>

      {/* Calendar Content */}
      <Suspense fallback={<LoadingSpinner />}>
        <CalendarContent />
      </Suspense>
    </div>
  )
}
