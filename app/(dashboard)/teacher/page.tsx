import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTeacherProfile } from '@/lib/dal/teacher'
import {
  getTeacherStats,
  getTodaysLiveSessions,
  getRecentPendingSubmissions,
  getGradedNotReleasedItems,
  getDraftModules,
  getTodaysAbsentStudents,
  getUpcomingDeadlines,
  getRecentActivity
} from '@/lib/dal/dashboard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StatsWidget from '@/components/teacher/dashboard/StatsWidget'
import AttendanceAlertsWidget from '@/components/teacher/dashboard/AttendanceAlertsWidget'
import DashboardWidgetsGrid from '@/components/teacher/dashboard/DashboardWidgetsGrid'

export const metadata = {
  title: 'Dashboard | MSU Teacher Portal',
  description: 'Teacher dashboard overview'
}

// Loading components for Suspense
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function WidgetsLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function WidgetLoading() {
  return (
    <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
  )
}

// Server component for stats
async function DashboardStats({ teacherId }: { teacherId: string }) {
  const stats = await getTeacherStats(teacherId)
  return <StatsWidget stats={stats} />
}

// Server component that fetches all widget data in parallel
async function DashboardWidgetsWrapper({ teacherId }: { teacherId: string }) {
  const [sessions, recentSubmissions, stats, gradedItems, drafts, deadlines, activities] =
    await Promise.all([
      getTodaysLiveSessions(teacherId),
      getRecentPendingSubmissions(teacherId, 3),
      getTeacherStats(teacherId),
      getGradedNotReleasedItems(teacherId),
      getDraftModules(teacherId, 5),
      getUpcomingDeadlines(teacherId, 7),
      getRecentActivity(teacherId, 5),
    ])

  return (
    <DashboardWidgetsGrid
      sessions={sessions}
      recentSubmissions={recentSubmissions}
      totalPending={stats.pending_submissions}
      gradedItems={gradedItems}
      drafts={drafts}
      totalDraftCount={stats.draft_modules}
      deadlines={deadlines}
      activities={activities}
    />
  )
}

// Server component for attendance alerts
async function AttendanceAlerts({ teacherId }: { teacherId: string }) {
  const absentStudents = await getTodaysAbsentStudents(teacherId)
  return <AttendanceAlertsWidget absentStudents={absentStudents} />
}

export default async function TeacherDashboardPage() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Welcome, {teacherProfile.profile.full_name}!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Today: {currentDate}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-6">
        <Suspense fallback={<StatsLoading />}>
          <DashboardStats teacherId={teacherProfile.id} />
        </Suspense>
      </div>

      {/* Widget Summary Cards */}
      <div className="mb-6">
        <Suspense fallback={<WidgetsLoading />}>
          <DashboardWidgetsWrapper teacherId={teacherProfile.id} />
        </Suspense>
      </div>

      {/* Full-width Attendance Alerts */}
      <div className="mb-6">
        <Suspense fallback={<WidgetLoading />}>
          <AttendanceAlerts teacherId={teacherProfile.id} />
        </Suspense>
      </div>
    </div>
  )
}
