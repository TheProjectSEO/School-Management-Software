import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher'
import { getTeacherAssessments, getAssessmentStats } from '@/lib/dal/assessments'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'
import CreateAssessmentButton from './CreateAssessmentButton'

export const metadata = {
  title: 'Assessments | MSU Teacher Portal',
  description: 'Manage quizzes, tests, and assignments'
}

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string }>
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

async function CreateAssessmentButtonWrapper() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    return null
  }

  const subjects = await getTeacherSubjects(teacherProfile.id)

  return <CreateAssessmentButton subjects={subjects} />
}

async function QuickStats() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    return null
  }

  const stats = await getAssessmentStats(teacherProfile.id)

  return (
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
              {stats.totalAssessments}
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
              {stats.pendingGrading}
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
              {stats.graded}
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
              {stats.upcomingDue}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Upcoming Due
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

async function AssessmentsContent({ typeFilter }: { typeFilter?: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const assessments = await getTeacherAssessments(teacherProfile.id, {
    type: typeFilter
  })

  if (assessments.length === 0) {
    return (
      <EmptyState
        icon="quiz"
        title={typeFilter ? `No ${typeFilter}s yet` : "No assessments yet"}
        description={typeFilter
          ? `You haven't created any ${typeFilter}s. Create one to get started.`
          : "Create your first assessment to get started. You can create quizzes, assignments, projects, and exams."
        }
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

// Filter tab configuration
const filterTabs = [
  { label: 'All', value: undefined, href: '/teacher/assessments' },
  { label: 'Quizzes', value: 'quiz', href: '/teacher/assessments?type=quiz' },
  { label: 'Assignments', value: 'assignment', href: '/teacher/assessments?type=assignment' },
  { label: 'Projects', value: 'project', href: '/teacher/assessments?type=project' },
  { label: 'Exams', value: 'exam', href: '/teacher/assessments?type=exam' },
]

export default async function AssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentType = params.type

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
          <Suspense fallback={
            <button disabled className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/50 text-white font-semibold cursor-not-allowed">
              <span className="material-symbols-outlined text-lg">add</span>
              Create Assessment
            </button>
          }>
            <CreateAssessmentButtonWrapper />
          </Suspense>
        </div>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<LoadingSpinner />}>
        <QuickStats />
      </Suspense>

      {/* Filter Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = currentType === tab.value
            return (
              <Link
                key={tab.label}
                href={tab.href}
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

      {/* Assessments List */}
      <Suspense fallback={<LoadingSpinner />}>
        <AssessmentsContent typeFilter={currentType} />
      </Suspense>
    </div>
  )
}
