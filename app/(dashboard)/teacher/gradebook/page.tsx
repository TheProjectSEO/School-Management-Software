export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTeacherProfile, getTeacherSubjects } from '@/lib/dal/teacher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'

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
  const teacherName = teacherProfile.profile?.full_name || 'You'

  // Compute quick stats — count students per unique section to avoid multiplying
  const sectionStudentCounts = new Map<string, number>()
  for (const s of subjects) {
    const key = s.section_id || `course-${s.id}`
    if (!sectionStudentCounts.has(key)) {
      sectionStudentCounts.set(key, s.student_count || 0)
    }
  }
  const totalStudents = Array.from(sectionStudentCounts.values()).reduce((sum, n) => sum + n, 0)
  const totalCourses = subjects.length

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
    <>
      {/* Stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">school</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCourses}</div>
              <div className="text-xs text-slate-500">Courses</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-xl">group</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</div>
              <div className="text-xs text-slate-500">Total Students</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Courses Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Grade Level
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Students
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Modules
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {subjects.map((subject) => (
              <tr
                key={subject.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 group"
              >
                {/* Subject */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-white text-base">menu_book</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {subject.name}
                      </div>
                      <Badge variant="default" className="mt-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {subject.subject_code}
                      </Badge>
                    </div>
                  </div>
                </td>

                {/* Teacher */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-sm">person</span>
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{teacherName}</span>
                  </div>
                </td>

                {/* Section */}
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{subject.section_name || '—'}</span>
                </td>

                {/* Grade Level */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    Grade {subject.grade_level}
                  </span>
                </td>

                {/* Students */}
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-blue-500 text-base">group</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{subject.student_count}</span>
                  </div>
                </td>

                {/* Modules */}
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-green-500 text-base">library_books</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{subject.module_count}</span>
                  </div>
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/teacher/gradebook/${subject.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    Open
                    <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function GradebookPage() {
  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['grades', 'submissions', 'enrollments']} debounceMs={1500} />
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Gradebook
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          Select a course to view and manage student grades
        </p>
      </div>

      {/* Course List */}
      <Suspense fallback={<LoadingSpinner />}>
        <GradebookCourseList />
      </Suspense>
    </div>
  )
}
