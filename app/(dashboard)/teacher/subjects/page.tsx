import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher'
import { getSubjectsPageStats } from '@/lib/dal/dashboard'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'
import { SubjectSortFilter } from './SubjectSortFilter'

export const metadata = {
  title: 'My Subjects | MSU Teacher Portal',
  description: 'Manage your subjects and course content'
}

type SubjectsPageData = {
  subjects: Awaited<ReturnType<typeof getTeacherSubjects>>
  stats: {
    totalSubjects: number
    totalModules: number
    publishedModules: number
    draftModules: number
  }
}

async function getSubjectsPageData(): Promise<SubjectsPageData | null> {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    return null
  }

  const [subjects, stats] = await Promise.all([
    getTeacherSubjects(teacherProfile.id),
    getSubjectsPageStats(teacherProfile.id)
  ])

  return { subjects, stats }
}

async function SubjectsContent({
  sort,
  grade,
}: {
  sort: string
  grade: string
}) {
  const data = await getSubjectsPageData()

  if (!data) {
    redirect('/login')
  }

  let { subjects } = data

  // Apply grade filter
  if (grade && grade !== 'all') {
    subjects = subjects.filter((s) => s.grade_level === grade)
  }

  // Apply sort
  switch (sort) {
    case 'name-desc':
      subjects = [...subjects].sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'students-desc':
      subjects = [...subjects].sort((a, b) => b.student_count - a.student_count)
      break
    case 'modules-desc':
      subjects = [...subjects].sort((a, b) => b.module_count - a.module_count)
      break
    case 'name-asc':
    default:
      subjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="book_2"
        title="No subjects found"
        description={grade && grade !== 'all'
          ? `No subjects found for Grade ${grade}. Try a different filter.`
          : "You don't have any subjects assigned yet. Contact your administrator to get assigned to courses."
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => (
        <Link
          key={subject.id}
          href={`/teacher/subjects/${subject.id}`}
          className="block group"
        >
          <Card className="h-full hover:border-primary transition-colors">
            {/* Cover Image */}
            <div className="w-full h-32 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 mb-4 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-5xl">
                book_2
              </span>
            </div>

            {/* Subject Info */}
            <div className="space-y-3">
              <div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1">
                    {subject.name}
                  </h3>
                  <Badge variant="success">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {subject.subject_code}
                </p>
              </div>

              {subject.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {subject.description}
                </p>
              )}

              {/* Section Info */}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">
                  groups
                </span>
                <span>{subject.section_name} • Grade {subject.grade_level}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {subject.module_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Modules
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {subject.student_count}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Students
                </div>
              </div>
            </div>

            {/* View Action */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Manage Subject</span>
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

async function QuickStats() {
  const data = await getSubjectsPageData()

  if (!data) {
    return null
  }

  const { stats } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">
              book_2
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalSubjects}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Total Subjects
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              article
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalModules}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Total Modules
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
              {stats.publishedModules}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Published
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-yellow-600 text-2xl">
              edit
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.draftModules}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Drafts
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; grade?: string }>
}) {
  const { sort = 'name-asc', grade = 'all' } = await searchParams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Subjects
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your subjects and course content
          </p>
        </div>
        <SubjectSortFilter />
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<LoadingSpinner />}>
        <QuickStats />
      </Suspense>

      {/* Subjects Grid */}
      <Suspense fallback={<LoadingSpinner />}>
        <SubjectsContent sort={sort} grade={grade} />
      </Suspense>
    </div>
  )
}
