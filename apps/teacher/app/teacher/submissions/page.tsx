import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getPendingSubmissions } from '@/lib/dal/assessments'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'

export const metadata = {
  title: 'Grading Inbox | MSU Teacher Portal',
  description: 'Review and grade student submissions'
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

function getStatusBadge(submission: any) {
  switch (submission.status) {
    case 'submitted':
      return <Badge variant="warning">Pending Review</Badge>
    case 'graded':
      return submission.has_feedback ? (
        <Badge variant="success">Graded</Badge>
      ) : (
        <Badge variant="info">Needs Feedback</Badge>
      )
    case 'returned':
      return <Badge variant="success">Returned</Badge>
    default:
      return <Badge variant="default">{submission.status}</Badge>
  }
}

async function SubmissionsContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const submissions = await getPendingSubmissions(teacherProfile.id)

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon="grading"
        title="No submissions to grade"
        description="All caught up! There are no pending submissions at the moment."
      />
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Link
          key={submission.id}
          href={`/teacher/submissions/${submission.id}`}
          className="block group"
        >
          <Card className="hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              {/* Student Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-lg">
                  {submission.student_name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                      {submission.student_name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      LRN: {submission.student_lrn}
                    </p>
                  </div>
                  {getStatusBadge(submission)}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                  <span className="material-symbols-outlined text-base">
                    assignment
                  </span>
                  <span className="font-medium">{submission.assessment_title}</span>
                </div>

                {/* Submission Details */}
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

              {/* Arrow */}
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform flex-shrink-0">
                arrow_forward
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function SubmissionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Grading Inbox
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Review and grade student submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold transition-colors">
            <span className="material-symbols-outlined text-lg">
              sort
            </span>
            Sort
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold transition-colors">
            <span className="material-symbols-outlined text-lg">
              filter_list
            </span>
            Filter
          </button>
        </div>
      </div>

      {/* Quick Stats */}
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
                -
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
                -
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
                -
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
                -
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Avg. Grading Time
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
          <button className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-primary font-semibold text-sm whitespace-nowrap">
            All Pending
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Needs Review
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Needs Feedback
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Graded
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Returned
          </button>
        </div>
      </Card>

      {/* Submissions List */}
      <Suspense fallback={<LoadingSpinner />}>
        <SubmissionsContent />
      </Suspense>
    </div>
  )
}
