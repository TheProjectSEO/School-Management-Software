import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getTeacherSections } from '@/lib/dal/teacher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Suspense } from 'react'

export const metadata = {
  title: 'My Classes | MSU Teacher Portal',
  description: 'Manage your sections and class rosters'
}

async function ClassesContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const sections = await getTeacherSections(teacherProfile.id)

  if (sections.length === 0) {
    return (
      <EmptyState
        icon="groups"
        title="No classes assigned"
        description="You don't have any class sections assigned yet. Contact your administrator to get assigned to sections."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sections.map((section) => (
        <Link
          key={section.id}
          href={`/teacher/classes/${section.id}`}
          className="block group"
        >
          <Card className="h-full hover:border-primary transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    groups
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                    {section.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Grade {section.grade_level}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-lg">
                    school
                  </span>
                  <span className="text-sm">Students</span>
                </div>
                <Badge variant="info">
                  {section.student_count}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-lg">
                    book_2
                  </span>
                  <span className="text-sm">Subjects</span>
                </div>
                <Badge variant="default">
                  {section.subject_count}
                </Badge>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">View Section</span>
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

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            My Classes
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your sections and class rosters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold transition-colors">
            <span className="material-symbols-outlined text-lg">
              filter_list
            </span>
            Filter
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <Suspense fallback={<LoadingSpinner />}>
        <ClassesContent />
      </Suspense>
    </div>
  )
}
