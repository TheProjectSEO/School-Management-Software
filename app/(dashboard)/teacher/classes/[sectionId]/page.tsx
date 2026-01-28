import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeacherProfile, getSectionDetails } from '@/lib/dal/teacher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const metadata = {
  title: 'Section Details | MSU Teacher Portal',
  description: 'View section details, students, and subjects'
}

async function SectionDetailsContent({ sectionId }: { sectionId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const section = await getSectionDetails(sectionId, teacherProfile.id)

  if (!section) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">
              groups
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {section.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Grade {section.grade_level} - {section.students.length} students
            </p>
          </div>
        </div>
        <Link
          href="/teacher/classes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Classes
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href={`/teacher/live-sessions?sectionId=${section.id}&openCreate=1`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-xl">
                  videocam
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Start Live Session
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Begin a virtual class
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/teacher/attendance?sectionId=${section.id}`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-xl">
                  calendar_today
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Take Attendance
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record today's attendance
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/teacher/announcements?sectionId=${section.id}`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-xl">
                  campaign
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Send Announcement
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notify students
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/teacher/assessments?sectionId=${section.id}&create=1`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-xl">
                  assignment
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Create Assessment
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add quiz or assignment
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Subjects You Teach */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Subjects You Teach
          </h2>
          <Badge variant="info">{section.courses.length} subjects</Badge>
        </div>

        {section.courses.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4">
            No subjects assigned to you in this section.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.courses.map((course) => (
              <Link
                key={course.id}
                href={`/teacher/subjects/${course.id}`}
                className="block p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      book_2
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {course.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {course.subject_code} - {course.module_count} modules
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">
                    chevron_right
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Student Roster */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Student Roster
          </h2>
          <Badge variant="success">{section.students.length} students</Badge>
        </div>

        {section.students.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            No students enrolled in this section yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Student Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    LRN
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Grade Level
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {section.students.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`border-b border-slate-100 dark:border-slate-800 ${
                      index % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {student.profile.avatar_url ? (
                          <img
                            src={student.profile.avatar_url}
                            alt={student.profile.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {student.profile.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {student.profile.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {student.lrn || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      Grade {student.grade_level}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/teacher/students/${student.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          visibility
                        </span>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SectionDetailsContent sectionId={sectionId} />
    </Suspense>
  )
}
