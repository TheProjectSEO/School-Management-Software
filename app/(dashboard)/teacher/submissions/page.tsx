export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getPendingSubmissions, groupSubmissionsByStudent, Submission, StudentSubmissionGroup } from '@/lib/dal/assessments'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'

export const metadata = {
  title: 'Grading Inbox | MSU Teacher Portal',
  description: 'Review and grade student submissions'
}

interface PageProps {
  searchParams: Promise<{ status?: string; student?: string }>
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (days > 7) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getStatusBadge(submission: Submission) {
  switch (submission.status) {
    case 'submitted':
      return <Badge variant="warning">Pending Review</Badge>
    case 'graded':
      return submission.has_feedback ? (
        <Badge variant="success">Graded</Badge>
      ) : (
        <Badge variant="info">Needs Feedback</Badge>
      )
    case 'released':
      return <Badge variant="success">Released</Badge>
    case 'returned':
      return <Badge variant="success">Returned</Badge>
    default:
      return <Badge variant="default">{submission.status}</Badge>
  }
}

function computeStats(submissions: Submission[]) {
  const pendingReview = submissions.filter(s => s.status === 'submitted').length
  const needsFeedback = submissions.filter(s => s.status === 'graded' && !s.has_feedback).length

  const today = new Date()
  const gradedToday = submissions.filter(s => {
    if (!s.graded_at) return false
    const graded = new Date(s.graded_at)
    return graded.toDateString() === today.toDateString()
  }).length

  const gradedWithTimes = submissions.filter(s => s.graded_at && s.submitted_at)
  let avgGradingTime: string | null = null
  if (gradedWithTimes.length > 0) {
    const totalMs = gradedWithTimes.reduce((acc, s) => {
      return acc + (new Date(s.graded_at!).getTime() - new Date(s.submitted_at).getTime())
    }, 0)
    avgGradingTime = formatDuration(totalMs / gradedWithTimes.length)
  }

  return { pendingReview, needsFeedback, gradedToday, avgGradingTime }
}

function filterSubmissions(allSubmissions: Submission[], statusFilter?: string): Submission[] {
  switch (statusFilter) {
    case 'needs-review':
      return allSubmissions.filter(s => s.status === 'submitted')
    case 'needs-feedback':
      return allSubmissions.filter(s => s.status === 'graded' && !s.has_feedback)
    case 'graded':
      return allSubmissions.filter(s => s.status === 'graded')
    case 'released':
      return allSubmissions.filter(s => s.status === 'released')
    case 'returned':
      return allSubmissions.filter(s => s.status === 'returned')
    default:
      return allSubmissions
  }
}

// --- Stats Cards (reused in both views) ---

function StatsCards({ submissions }: { submissions: Submission[] }) {
  const stats = computeStats(submissions)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-yellow-600 text-2xl">
              pending_actions
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.pendingReview}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Pending Review
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              rate_review
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.needsFeedback}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Needs Feedback
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-2xl">
              check_circle
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.gradedToday}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Graded Today
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">
              avg_pace
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.avgGradingTime || 'N/A'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Avg. Grading Time
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// --- Student List View (default) ---

function StudentListView({
  groups,
  statusFilter,
}: {
  groups: StudentSubmissionGroup[]
  statusFilter?: string
}) {
  // Apply filter: recompute groups from filtered submissions
  const filteredGroups = statusFilter
    ? groups
      .map(g => {
        const filtered = filterSubmissions(g.submissions, statusFilter)
        if (filtered.length === 0) return null
        return {
          ...g,
          submissions: filtered,
          pending_count: filtered.filter(s => s.status === 'submitted').length,
          graded_count: filtered.filter(s => s.status === 'graded').length,
          released_count: filtered.filter(s => s.status === 'released' || s.status === 'returned').length,
          total_count: filtered.length,
        }
      })
      .filter((g): g is StudentSubmissionGroup => g !== null)
    : groups

  if (filteredGroups.length === 0) {
    return (
      <EmptyState
        icon="grading"
        title={statusFilter ? "No submissions found" : "No submissions to grade"}
        description={statusFilter
          ? `No submissions match the "${statusFilter}" filter.`
          : "All caught up! There are no pending submissions at the moment."
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {filteredGroups.map((group) => (
        <Link
          key={group.student_id}
          href={`/teacher/submissions?student=${group.student_id}${statusFilter ? `&status=${statusFilter}` : ''}`}
          className="block group"
        >
          <Card className="hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              {/* Student Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {group.student_avatar_url ? (
                  <img
                    src={group.student_avatar_url}
                    alt={group.student_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-semibold text-lg">
                    {group.student_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                    {group.student_name}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  LRN: {group.student_lrn}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {group.pending_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {group.pending_count} pending
                    </span>
                  )}
                  {group.graded_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {group.graded_count} graded
                    </span>
                  )}
                  {group.released_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {group.released_count} released
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Latest: {formatDate(group.latest_submitted_at)}
                  </span>
                </div>
              </div>

              {/* Total count + arrow */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {group.total_count} {group.total_count === 1 ? 'submission' : 'submissions'}
                </span>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// --- Student Submissions View (when ?student= is set) ---

function StudentSubmissionsView({
  studentGroup,
  allStudentSubmissions,
  statusFilter,
}: {
  studentGroup: StudentSubmissionGroup
  allStudentSubmissions: Submission[]
  statusFilter?: string
}) {
  const filtered = filterSubmissions(allStudentSubmissions, statusFilter)

  // Compute avg score from graded submissions
  const gradedSubs = allStudentSubmissions.filter(s => s.score !== null)
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + s.score!, 0) / gradedSubs.length)
    : null

  return (
    <>
      {/* Back button + student header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/teacher/submissions${statusFilter ? `?status=${statusFilter}` : ''}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Students
        </Link>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {studentGroup.student_avatar_url ? (
              <img
                src={studentGroup.student_avatar_url}
                alt={studentGroup.student_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-primary font-bold text-xl">
                {studentGroup.student_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {studentGroup.student_name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              LRN: {studentGroup.student_lrn}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{studentGroup.total_count}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{studentGroup.pending_count}</div>
              <div className="text-xs text-slate-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{studentGroup.graded_count}</div>
              <div className="text-xs text-slate-500">Graded</div>
            </div>
            {avgScore !== null && (
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{avgScore}%</div>
                <div className="text-xs text-slate-500">Avg Score</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Submission list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="grading"
          title="No submissions found"
          description={statusFilter
            ? `No submissions match the "${statusFilter}" filter for this student.`
            : "This student has no submissions."
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((submission) => (
            <Link
              key={submission.id}
              href={`/teacher/submissions/${submission.id}`}
              className="block group"
            >
              <Card className="hover:border-primary transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-500 text-xl">
                      assignment
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                        {submission.assessment_title}
                      </h3>
                      {getStatusBadge(submission)}
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-base">
                          schedule
                        </span>
                        <span>Submitted {formatDate(submission.submitted_at)}</span>
                      </div>

                      {submission.attempt_number > 1 && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-base">
                            refresh
                          </span>
                          <span>Attempt {submission.attempt_number}</span>
                        </div>
                      )}

                      {submission.score !== null && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="material-symbols-outlined text-base">
                            check_circle
                          </span>
                          <span className="font-semibold">Score: {submission.score}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform flex-shrink-0">
                    arrow_forward
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

// --- Main content component ---

async function SubmissionsContent({
  statusFilter,
  studentId,
}: {
  statusFilter?: string
  studentId?: string
}) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const allSubmissions = await getPendingSubmissions(teacherProfile.id)
  const groups = groupSubmissionsByStudent(allSubmissions)

  if (studentId) {
    const studentGroup = groups.find(g => g.student_id === studentId)

    if (!studentGroup) {
      return (
        <EmptyState
          icon="person_off"
          title="Student not found"
          description="No submissions found for this student."
        />
      )
    }

    return (
      <StudentSubmissionsView
        studentGroup={studentGroup}
        allStudentSubmissions={studentGroup.submissions}
        statusFilter={statusFilter}
      />
    )
  }

  return (
    <>
      <StatsCards submissions={allSubmissions} />
      <StudentListView groups={groups} statusFilter={statusFilter} />
    </>
  )
}

// --- Filter tabs ---

function FilterTabs({
  currentStatus,
  studentId,
}: {
  currentStatus?: string
  studentId?: string
}) {
  const tabs = [
    { label: 'All', value: undefined },
    { label: 'Needs Review', value: 'needs-review' },
    { label: 'Needs Feedback', value: 'needs-feedback' },
    { label: 'Graded', value: 'graded' },
    { label: 'Released', value: 'released' },
    { label: 'Returned', value: 'returned' },
  ]

  function buildHref(statusValue?: string) {
    const params = new URLSearchParams()
    if (studentId) params.set('student', studentId)
    if (statusValue) params.set('status', statusValue)
    const qs = params.toString()
    return `/teacher/submissions${qs ? `?${qs}` : ''}`
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = currentStatus === tab.value
          return (
            <Link
              key={tab.label}
              href={buildHref(tab.value)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

// --- Page ---

export default async function SubmissionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentStatus = params.status
  const studentId = params.student

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Grading Inbox
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          {studentId ? 'Student submissions' : 'Review and grade student submissions'}
        </p>
      </div>

      {/* Filter Tabs */}
      <FilterTabs currentStatus={currentStatus} studentId={studentId} />

      {/* Content */}
      <Suspense fallback={<LoadingSpinner />}>
        <SubmissionsContent statusFilter={currentStatus} studentId={studentId} />
      </Suspense>
    </div>
  )
}
