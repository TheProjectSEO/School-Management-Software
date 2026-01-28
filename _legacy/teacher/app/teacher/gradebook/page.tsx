import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

export const metadata = {
  title: 'Gradebook | MSU Teacher Portal',
  description: 'Manage student grades for your courses',
}

async function GradebookCourseList() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const subjects = await getTeacherSubjects(teacherProfile.id)

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="school"
        title="No courses assigned"
        description="You don't have any courses assigned yet. Contact your administrator to get course assignments."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => (
        <Link
          key={subject.id}
          href={`/teacher/gradebook/${subject.id}`}
          className="block group"
        >
          <Card className="h-full hover:border-primary transition-all hover:shadow-lg">
            {/* Cover Image or Gradient */}
            <div className="relative h-32 -mx-5 -mt-5 mb-4 rounded-t-xl overflow-hidden">
              {subject.cover_image_url ? (
                <img
                  src={subject.cover_image_url}
                  alt={subject.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-msu-gold/50" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Subject Code Badge */}
              <div className="absolute top-3 right-3">
                <Badge variant="default" className="bg-white/90 text-slate-800">
                  {subject.subject_code}
                </Badge>
              </div>

              {/* Title on Image */}
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-bold text-lg text-white line-clamp-2 group-hover:underline">
                  {subject.name}
                </h3>
              </div>
            </div>

            {/* Section Info */}
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-lg">
                group
              </span>
              <span>{subject.section_name}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span>{subject.grade_level}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                    person
                  </span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {subject.student_count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Students
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                    menu_book
                  </span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {subject.module_count}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Modules
                  </div>
                </div>
              </div>
            </div>

            {/* Action Hint */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm text-primary font-semibold group-hover:underline">
                Open Gradebook
              </span>
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function GradebookPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Gradebook
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Select a course to view and manage student grades
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                score
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                —
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Grades Entered
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
                —
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Pending Review
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
                —
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Released
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">
                percent
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                —
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Class Average
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Course List */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Courses
        </h2>
        <Suspense fallback={<LoadingSpinner />}>
          <GradebookCourseList />
        </Suspense>
      </div>
    </div>
  )
}
