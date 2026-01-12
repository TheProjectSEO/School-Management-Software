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
import StatsWidget from '@/components/dashboard/StatsWidget'
import TodaysSessionsWidget from '@/components/dashboard/TodaysSessionsWidget'
import GradingInboxWidget from '@/components/dashboard/GradingInboxWidget'
import PendingReleasesWidget from '@/components/dashboard/PendingReleasesWidget'
import DraftContentWidget from '@/components/dashboard/DraftContentWidget'
import AttendanceAlertsWidget from '@/components/dashboard/AttendanceAlertsWidget'
import UpcomingDeadlinesWidget from '@/components/dashboard/UpcomingDeadlinesWidget'
import RecentActivityWidget from '@/components/dashboard/RecentActivityWidget'

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

// Server component for today's sessions
async function TodaysSessions({ teacherId }: { teacherId: string }) {
  const sessions = await getTodaysLiveSessions(teacherId)
  return <TodaysSessionsWidget sessions={sessions} />
}

// Server component for grading inbox
async function GradingInbox({ teacherId }: { teacherId: string }) {
  const [recentSubmissions, stats] = await Promise.all([
    getRecentPendingSubmissions(teacherId, 3),
    getTeacherStats(teacherId)
  ])
  return (
    <GradingInboxWidget
      recentSubmissions={recentSubmissions}
      totalPending={stats.pending_submissions}
    />
  )
}

// Server component for pending releases
async function PendingReleases({ teacherId }: { teacherId: string }) {
  const items = await getGradedNotReleasedItems(teacherId)
  return <PendingReleasesWidget items={items} />
}

// Server component for draft content
async function DraftContent({ teacherId }: { teacherId: string }) {
  const [drafts, stats] = await Promise.all([
    getDraftModules(teacherId, 5),
    getTeacherStats(teacherId)
  ])
  return <DraftContentWidget drafts={drafts} totalCount={stats.draft_modules} />
}

// Server component for attendance alerts
async function AttendanceAlerts({ teacherId }: { teacherId: string }) {
  const absentStudents = await getTodaysAbsentStudents(teacherId)
  return <AttendanceAlertsWidget absentStudents={absentStudents} />
}

// Server component for upcoming deadlines
async function UpcomingDeadlines({ teacherId }: { teacherId: string }) {
  const deadlines = await getUpcomingDeadlines(teacherId, 7)
  return <UpcomingDeadlinesWidget deadlines={deadlines} />
}

// Server component for recent activity
async function RecentActivity({ teacherId }: { teacherId: string }) {
  const activities = await getRecentActivity(teacherId, 5)
  return <RecentActivityWidget activities={activities} />
}

export default async function TeacherDashboardPage() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
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

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Sessions */}
        <Suspense fallback={<WidgetLoading />}>
          <TodaysSessions teacherId={teacherProfile.id} />
        </Suspense>

        {/* Grading Inbox */}
        <Suspense fallback={<WidgetLoading />}>
          <GradingInbox teacherId={teacherProfile.id} />
        </Suspense>

        {/* Pending Releases */}
        <Suspense fallback={<WidgetLoading />}>
          <PendingReleases teacherId={teacherProfile.id} />
        </Suspense>

        {/* Draft Content */}
        <Suspense fallback={<WidgetLoading />}>
          <DraftContent teacherId={teacherProfile.id} />
        </Suspense>

        {/* Upcoming Deadlines */}
        <Suspense fallback={<WidgetLoading />}>
          <UpcomingDeadlines teacherId={teacherProfile.id} />
        </Suspense>

        {/* Recent Activity */}
        <Suspense fallback={<WidgetLoading />}>
          <RecentActivity teacherId={teacherProfile.id} />
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
