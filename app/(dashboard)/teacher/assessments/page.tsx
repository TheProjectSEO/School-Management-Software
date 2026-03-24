export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher'
import { getTeacherAssessments, getAssessmentStats } from '@/lib/dal/assessments'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'
import CreateAssessmentButton from './CreateAssessmentButton'
import AssessmentCard from './AssessmentCard'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'

export const metadata = {
  title: 'Assessments | MSU Teacher Portal',
  description: 'Manage quizzes, tests, and assignments'
}

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string }>
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
        <AssessmentCard key={assessment.id} assessment={assessment} />
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
      <RealtimeRefresher tables={['assessments', 'submissions']} />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Assessments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Manage quizzes, tests, and assignments
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
