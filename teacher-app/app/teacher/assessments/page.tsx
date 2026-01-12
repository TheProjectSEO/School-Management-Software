import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getTeacherAssessments } from '@/lib/dal/assessments'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'

export const metadata = {
  title: 'Assessments | MSU Teacher Portal',
  description: 'Manage quizzes, tests, and assignments'
}

function getAssessmentIcon(type: string) {
  switch (type) {
    case 'quiz':
      return 'quiz'
    case 'assignment':
      return 'assignment'
    case 'project':
      return 'folder'
    case 'midterm':
    case 'final':
      return 'school'
    default:
      return 'task'
  }
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'closed':
      return 'danger'
    default:
      return 'info'
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'No due date'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

async function AssessmentsContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const assessments = await getTeacherAssessments(teacherProfile.id)

  if (assessments.length === 0) {
    return (
      <EmptyState
        icon="quiz"
        title="No assessments yet"
        description="Create your first assessment to get started. You can create quizzes, assignments, projects, and exams."
      />
    )
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment) => (
        <Link
          key={assessment.id}
          href={`/teacher/assessments/${assessment.id}`}
          className="block group"
        >
          <Card className="hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-3xl">
                  {getAssessmentIcon(assessment.type)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                      {assessment.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <span className="capitalize">{assessment.type}</span>
                      <span>•</span>
                      <span>{assessment.course_name}</span>
                      <span>•</span>
                      <span>{assessment.section_name}</span>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(assessment.status)} className="ml-3">
                    {assessment.status}
                  </Badge>
                </div>

                {assessment.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mb-3">
                    {assessment.description}
                  </p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Due Date
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(assessment.due_date)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Total Points
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {assessment.total_points}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Submissions
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {assessment.submission_count}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Graded
                    </div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {assessment.graded_count}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Pending
                    </div>
                    <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                      {assessment.submission_count - assessment.graded_count}
                    </div>
                  </div>
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

export default function AssessmentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Assessments
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage quizzes, tests, and assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold transition-colors">
            <span className="material-symbols-outlined text-lg">
              filter_list
            </span>
            Filter
          </button>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">
            <span className="material-symbols-outlined text-lg">
              add
            </span>
            Create Assessment
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">
                quiz
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                -
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Assessments
              </div>
            </div>
          </div>
        </Card>

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
                Pending Grading
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
                Graded
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-2xl">
                schedule
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                -
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Upcoming Due
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
          <button className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-primary font-semibold text-sm whitespace-nowrap">
            All
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Quizzes
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Assignments
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Projects
          </button>
          <button className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-semibold text-sm whitespace-nowrap transition-colors">
            Exams
          </button>
        </div>
      </Card>

      {/* Assessments List */}
      <Suspense fallback={<LoadingSpinner />}>
        <AssessmentsContent />
      </Suspense>
    </div>
  )
}
